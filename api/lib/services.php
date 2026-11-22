<?php
/** The shop's business rules: delivery zones, coupons, placing orders, changing order status, stock, dashboard numbers. */

/* ---------- delivery zones ---------- */
function get_zones(bool $onlyActive = true): array {
    $all = array_values(array_filter(db_list('zones'), fn($z) => !$onlyActive || !empty($z['active'])));
    usort($all, fn($a, $b) => (($a['sortOrder'] ?? 0) <=> ($b['sortOrder'] ?? 0)) ?: strcmp($a['name'], $b['name']));
    return $all;
}

/* ---------- offers / coupons ---------- */
function offer_is_live(array $o, ?int $at = null): bool {
    $at ??= time();
    if (empty($o['active'])) return false;
    if (!empty($o['startsAt']) && strtotime($o['startsAt'] . ' 00:00:00 UTC') > $at) return false;
    if (!empty($o['endsAt']) && strtotime($o['endsAt'] . ' 00:00:00 UTC') + 86400 <= $at) return false;   // the end date is inclusive
    return true;
}
function evaluate_coupon(string $code, float $subtotal): array {
    $code = strtoupper(trim($code));
    $offer = null;
    foreach (db_list('offers') as $o) if (!empty($o['code']) && $o['code'] === $code) { $offer = $o; break; }
    if (!$offer || !offer_is_live($offer)) throw new ApiError(400, 'This coupon code is invalid or has expired');
    if ($subtotal < $offer['minOrder']) throw new ApiError(400, 'Add items worth ৳' . $offer['minOrder'] . ' or more to use this coupon');
    $raw = $offer['discountType'] === 'percent' ? (int)round($subtotal * $offer['discountValue'] / 100) : $offer['discountValue'];
    return ['offer' => $offer, 'discount' => max(0, min($raw, $subtotal))];
}

/* ---------- placing an order ---------- */
const RELEASES = ['cancelled', 'returned'];   // statuses that give the stock back

function make_order_no(): string {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // no 0/O/1/I: easy to read out over the phone
    $s = ''; for ($i = 0; $i < 7; $i++) $s .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    return 'DM-' . $s;
}
/** Same key => same order id, so a retried or double-tapped checkout can never create a second order. */
function order_id_for(?string $key): string { return $key ? substr(hash('sha256', 'order:' . $key), 0, 16) : new_id(); }

function create_order(array $in): array {
    $id = order_id_for($in['idempotencyKey'] ?? null);
    if (!empty($in['idempotencyKey']) && ($prior = db_get('orders', $id))) return $prior;      // a retry: return the same order
    assert_customer_may_order($in['phone']);

    $products = []; foreach (db_list('products') as $p) $products[$p['id']] = $p;
    $settings = get_settings();
    $zone = null; foreach (get_zones() as $z) if ($z['id'] === $in['zone']) $zone = $z;
    if (!$zone) throw new ApiError(400, 'Please choose a valid delivery area');

    // merge duplicate lines (same product AND same variant)
    $lines = [];
    foreach ($in['items'] as $l) {
        $k = $l['id'] . '~' . ($l['variantId'] ?? '');
        if (isset($lines[$k])) $lines[$k]['qty'] += $l['qty']; else $lines[$k] = ['id' => $l['id'], 'variantId' => $l['variantId'] ?? null, 'qty' => $l['qty']];
    }
    $items = [];
    foreach ($lines as $l) {
        $p = $products[$l['id']] ?? null;
        if (!$p || empty($p['active'])) throw new ApiError(400, 'A product in your cart is no longer available. Please review your cart.');
        $price = $p['price']; $unit = $p['unit']; $vFields = [];
        if (has_variants($p)) {
            $problem = variant_stock_problem($p, $l['variantId'], $l['qty']);
            if ($problem !== '') throw new ApiError(empty($l['variantId']) || !find_variant($p, $l['variantId']) ? 400 : 409, $problem);
            $v = find_variant($p, $l['variantId']);       // the price ALWAYS comes from the server's copy of the variant, never from the browser
            $price = $v['price']; $unit = variant_label($v); $vFields = ['variantId' => $v['id'], 'variantLabel' => variant_label($v)];
        } else {
            if (!empty($l['variantId'])) throw new ApiError(400, 'An option in your cart is no longer available. Please review your cart.');
            if ($p['stock'] < $l['qty']) throw new ApiError(409, $p['stock'] <= 0 ? $p['name'] . ' is out of stock' : "Only {$p['stock']} of {$p['name']} left in stock");
        }
        $items[] = array_merge(['id' => $p['id'], 'name' => $p['name'], 'unit' => $unit, 'price' => $price, 'qty' => $l['qty'], 'image' => $p['image'] ?? null, 'emoji' => $p['emoji'] ?? null], $vFields,
                               isset($p['cost']) ? ['cost' => $p['cost']] : []);   // cost snapshot feeds cost of goods sold
    }
    $subtotal = array_sum(array_map(fn($i) => $i['price'] * $i['qty'], $items));
    $discount = 0; $couponCode = null;
    if (!empty($in['couponCode'])) { $r = evaluate_coupon($in['couponCode'], $subtotal); $discount = $r['discount']; $couponCode = $r['offer']['code']; }
    if (($settings['minOrder'] ?? 0) > 0 && $subtotal < $settings['minOrder']) throw new ApiError(400, 'Minimum order amount is ৳' . $settings['minOrder']);
    $delivery = ($zone['freeOver'] > 0 && $subtotal - $discount >= $zone['freeOver']) ? 0 : $zone['charge'];
    $serviceCharge = max(0, (float)($settings['serviceCharge'] ?? 0));

    $opt = null; foreach (payment_options($settings) as $po) if ($po['id'] === $in['payment']) $opt = $po;
    if (!$opt || !empty($opt['disabled'])) throw new ApiError(400, !empty($opt['disabled']) ? 'Online payment is not available yet. Please choose another payment method.' : 'This payment method is not available. Please choose another one.');
    // manual mobile-money style methods: bKash / Nagad, or a custom method that needs a TrxID
    $isManual = in_array($in['payment'], ['bkash', 'nagad'], true) || (!in_array($in['payment'], ['cod', 'online'], true) && ($opt['requireTrx'] ?? true) !== false);
    if ($isManual) {
        if (empty($in['paymentRef']) || strlen($in['paymentRef']) < 6) throw new ApiError(400, 'Enter the Transaction ID (TrxID) of your payment');
        if (empty($in['paymentFrom']) || !preg_match('/^01[3-9]\d{8}$/', $in['paymentFrom'])) throw new ApiError(400, 'Enter the mobile number you paid from (01XXXXXXXXX)');
        $trx = strtoupper(trim($in['paymentRef']));
        foreach (db_find('orders', 'paymentRef', $trx) as $o) {
            if ($o['id'] !== $id && !in_array($o['status'], RELEASES, true)) throw new ApiError(409, 'This Transaction ID (TrxID) was already used for another order. Please check it and try again.');
        }
    }
    $hasRx = false; foreach ($items as $i) if (!empty($products[$i['id']]['prescriptionRequired'])) $hasRx = true;
    $now = now_iso();
    $order = [
        'id' => $id, 'orderNo' => make_order_no(), 'customerId' => $in['phone'], 'name' => $in['name'], 'phone' => $in['phone'], 'address' => $in['address'],
        'zone' => $zone['id'], 'zoneName' => $zone['name'], 'payment' => $in['payment'], 'paymentStatus' => $isManual ? 'pending' : 'unpaid',
        'note' => $in['note'] ?? '', 'items' => $items, 'subtotal' => $subtotal, 'delivery' => $delivery, 'serviceCharge' => $serviceCharge, 'discount' => $discount,
        'total' => $subtotal - $discount + $delivery + $serviceCharge, 'status' => 'pending', 'createdAt' => $now, 'updatedAt' => $now,
    ];
    if ($hasRx) $order['hasRx'] = true;
    if (!in_array($in['payment'], ['cod', 'bkash', 'nagad', 'online'], true)) $order['paymentLabel'] = $opt['label'];
    if ($isManual) { $order['paymentRef'] = strtoupper(trim($in['paymentRef'])); $order['paymentFrom'] = $in['paymentFrom']; }
    if ($in['lat'] !== null && $in['lng'] !== null) { $order['lat'] = $in['lat']; $order['lng'] = $in['lng']; }
    if ($couponCode) $order['couponCode'] = $couponCode;

    // The authoritative stock check + stock decrease + order save: one all-or-nothing database step.
    try {
        $r = Db::placeOrder($order, array_map(fn($i) => ['id' => $i['id'], 'qty' => $i['qty'], 'variantId' => $i['variantId'] ?? null], $items));
        if (!$r['duplicate']) {      // the order is already safely saved: a customer-record problem must never fail the checkout
            try { record_order_customer($r['order']); } catch (Throwable $e) { error_log('[crm] ' . $e->getMessage()); }
        }
        return $r['order'];
    } catch (StockError $e) {
        throw new ApiError($e->kind === 'unavailable' ? 400 : 409, $e->getMessage());
    }
}

/* ---------- order status ---------- */
function set_order_status(string $id, string $status): array {
    if (!in_array($status, ORDER_STATUSES, true)) throw new ApiError(400, 'Invalid status');
    $at = now_iso();
    $flow = ['move' => null];
    // The "stock restored" flag is claimed inside ONE atomic update, so two simultaneous cancels can never both give the stock back.
    $updated = db_mutate('orders', $id, function ($cur) use ($status, $at, &$flow) {
        $flow['move'] = null;
        if (!$cur) return null;
        $next = array_merge($cur, ['status' => $status, 'updatedAt' => $at]);
        if ($status === 'delivered' && $cur['status'] !== 'delivered') $next['deliveredAt'] = $at;      // revenue is dated by this
        if ($status === 'delivered' && ($cur['payment'] ?? '') === 'cod') $next['paymentStatus'] = 'paid';  // cash collected on delivery
        if (in_array($status, RELEASES, true) && empty($cur['stockRestored'])) { $next['stockRestored'] = true; $flow['move'] = 'restore'; }
        elseif (!in_array($status, RELEASES, true) && !empty($cur['stockRestored'])) { $next['stockRestored'] = false; $flow['move'] = 'take'; }
        return $next;
    });
    if (!$updated) throw new ApiError(404, 'Order not found');
    try { recompute_customer_stats($updated['phone']); } catch (Throwable $e) { error_log('[crm] ' . $e->getMessage()); }
    if ($flow['move']) {
        $move = $flow['move'];
        foreach ($updated['items'] as $i) {
            db_mutate('products', $i['id'], function ($p) use ($i, $move) {
                if (!$p) return null;
                $delta = $move === 'restore' ? $i['qty'] : -$i['qty'];
                $sold = $move === 'restore' ? max(0, ($p['sold'] ?? 0) - $i['qty']) : ($p['sold'] ?? 0) + $i['qty'];
                if (!empty($i['variantId'])) { $w = with_variant_stock($p, $i['variantId'], $delta); return $w ? array_merge($p, $w, ['sold' => $sold]) : array_merge($p, ['sold' => $sold]); }
                return array_merge($p, ['stock' => max(0, ($p['stock'] ?? 0) + $delta), 'sold' => $sold]);
            });
        }
    }
    return $updated;
}

function set_payment_status(string $id, string $paymentStatus): array {
    if (!db_get('orders', $id)) throw new ApiError(404, 'Order not found');
    return db_update('orders', $id, ['paymentStatus' => $paymentStatus, 'updatedAt' => now_iso()]);
}

function rider_approved(array $r): bool { return empty($r['status']) || $r['status'] === 'approved'; }

function assign_rider(string $id, string $riderId): array {
    $o = db_get('orders', $id);
    if (!$o) throw new ApiError(404, 'Order not found');
    $patch = ['updatedAt' => now_iso()];
    if ($riderId === '') {
        $patch += ['riderId' => '', 'riderName' => '', 'riderPhone' => ''];
        if ($o['status'] === 'assigned') $patch['status'] = 'processing';
    } else {
        $r = db_get('riders', $riderId);
        if (!$r) throw new ApiError(404, 'Rider not found');
        if (!rider_approved($r)) throw new ApiError(400, 'This rider has not been approved yet');
        if (empty($r['active'])) throw new ApiError(400, 'This rider is marked inactive');
        $patch += ['riderId' => $r['id'], 'riderName' => $r['name'], 'riderPhone' => $r['phone']];
        if (in_array($o['status'], ['pending', 'confirmed', 'processing'], true)) $patch['status'] = 'assigned';
    }
    return db_update('orders', $id, $patch);
}

/** Hand an order to a courier company (outside Dhaka). courierId "" removes the courier. A tracking number marks it on the way. */
function set_courier(string $id, ?string $courierId, ?string $trackingNo): array {
    $o = db_get('orders', $id);
    if (!$o) throw new ApiError(404, 'Order not found');
    $patch = ['updatedAt' => now_iso()];
    $cid = $o['courierId'] ?? null;
    if ($courierId !== null) {
        if ($courierId === '') { $cid = null; $patch += ['courierId' => null, 'courierName' => null, 'trackingNo' => null, 'courierUrl' => null, 'courierAt' => null]; }
        else {
            $c = db_get('couriers', $courierId);
            if (!$c) throw new ApiError(404, 'Courier not found');
            $cid = $c['id'];
            $patch += ['courierId' => $c['id'], 'courierName' => $c['name'], 'courierAt' => $o['courierAt'] ?? $patch['updatedAt']];
        }
    }
    if ($cid) {
        $c = db_get('couriers', $cid);
        $tn = $trackingNo !== null ? trim($trackingNo) : ($o['trackingNo'] ?? '');
        $patch['trackingNo'] = $tn !== '' ? $tn : null;
        $patch['courierUrl'] = (!empty($c['trackingUrl']) && $tn !== '') ? (str_contains($c['trackingUrl'], '{tracking}') ? str_replace('{tracking}', rawurlencode($tn), $c['trackingUrl']) : $c['trackingUrl']) : null;
        if ($tn !== '' && empty($o['trackingNo']) && in_array($o['status'], ['pending', 'confirmed', 'processing', 'assigned'], true)) $patch['status'] = 'on_the_way';
    } elseif ($trackingNo) {
        throw new ApiError(400, 'Choose a courier first');
    }
    return db_update('orders', $id, $patch);
}

/* ---------- inventory ---------- */
function adjust_stock(string $productId, string $mode, int $qty, string $reason, ?string $variantId = null): array {
    $at = now_iso(); $before = 0; $after = 0; $name = ''; $problem = '';
    $product = db_mutate('products', $productId, function ($p) use ($mode, $qty, $variantId, $at, &$before, &$after, &$name, &$problem) {
        $problem = '';
        if (!$p) return null;
        $name = $p['name'];
        if (has_variants($p)) {
            $v = find_variant($p, $variantId);
            if (!$v) { $problem = $variantId ? 'That variant no longer exists' : 'This product has variants: choose which one to adjust'; return null; }
            $before = $v['stock']; $name = $p['name'] . ' (' . variant_label($v) . ')';
            $after = max(0, $mode === 'add' ? $v['stock'] + $qty : ($mode === 'remove' ? $v['stock'] - $qty : $qty));
            return array_merge($p, with_variant_stock($p, $v['id'], $after - $before), ['updatedAt' => $at]);
        }
        $before = $p['stock'];
        $after = max(0, $mode === 'add' ? $p['stock'] + $qty : ($mode === 'remove' ? $p['stock'] - $qty : $qty));
        return array_merge($p, ['stock' => $after, 'updatedAt' => $at]);
    });
    if ($problem) throw new ApiError(400, $problem);
    if (!$product) throw new ApiError(404, 'Product not found');
    $log = ['id' => new_id(), 'productId' => $productId, 'productName' => $name, 'before' => $before, 'after' => $after, 'change' => $after - $before,
            'reason' => $reason ?: ($mode === 'add' ? 'Restock' : ($mode === 'remove' ? 'Stock removed' : 'Stock count')), 'createdAt' => $at];
    db_put('stocklogs', $log);
    return ['product' => $product, 'log' => $log];
}

/* ---------- dashboard numbers ---------- */
function day_key($t): string { return gmdate('Y-m-d', (is_int($t) ? $t : iso_to_ts($t)) + 6 * 3600); }   // Dhaka = UTC+6

function dashboard_stats(int $days = 14): array {
    $orders = db_list('orders'); $products = db_list('products');
    $live = array_values(array_filter($orders, fn($o) => !in_array($o['status'], RELEASES, true)));
    $today = day_key(time());
    $series = []; for ($i = $days - 1; $i >= 0; $i--) $series[day_key(time() - $i * 86400)] = ['date' => day_key(time() - $i * 86400), 'orders' => 0, 'sales' => 0];
    foreach ($live as $o) { $k = day_key($o['createdAt']); if (isset($series[$k])) { $series[$k]['orders']++; $series[$k]['sales'] += $o['total']; } }
    $series = array_values($series);
    $half = intdiv($days, 2);
    $cur = array_sum(array_column(array_slice($series, -$half), 'sales'));
    $prev = array_sum(array_column(array_slice($series, -$half * 2, $half), 'sales'));
    $breakdown = array_fill_keys(ORDER_STATUSES, 0);
    foreach ($orders as $o) $breakdown[$o['status']] = ($breakdown[$o['status']] ?? 0) + 1;
    $top = [];
    foreach ($live as $o) foreach ($o['items'] as $i) {
        $t = $top[$i['id']] ?? ['id' => $i['id'], 'name' => $i['name'], 'image' => $i['image'] ?? null, 'emoji' => $i['emoji'] ?? null, 'qty' => 0, 'revenue' => 0];
        $t['qty'] += $i['qty']; $t['revenue'] += $i['price'] * $i['qty']; $top[$i['id']] = $t;
    }
    usort($top, fn($a, $b) => $b['qty'] <=> $a['qty']);
    $todayOrders = array_values(array_filter($live, fn($o) => day_key($o['createdAt']) === $today));
    $sum = fn($list) => array_sum(array_column($list, 'total'));
    $active = array_filter($products, fn($p) => !empty($p['active']));
    $low = array_values(array_filter($active, fn($p) => $p['stock'] <= 10)); usort($low, fn($a, $b) => $a['stock'] <=> $b['stock']);
    $recent = $orders; usort($recent, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
    return [
        'totals' => [
            'revenue' => $sum(array_filter($orders, fn($o) => $o['status'] === 'delivered')), 'sales' => $sum($live), 'orders' => count($orders), 'pending' => $breakdown['pending'],
            'todayOrders' => count($todayOrders), 'todaySales' => $sum($todayOrders), 'customers' => count(array_unique(array_column($orders, 'phone'))),
            'avgOrder' => $live ? (int)round($sum($live) / count($live)) : 0, 'products' => count($products), 'activeProducts' => count($active),
            'outOfStock' => count(array_filter($active, fn($p) => $p['stock'] <= 0)),
        ],
        'trend' => $prev > 0 ? (int)round(($cur - $prev) / $prev * 100) : ($cur > 0 ? 100 : 0),
        'series' => $series, 'statusBreakdown' => $breakdown, 'topProducts' => array_slice($top, 0, 5),
        'lowStock' => array_map(fn($p) => ['id' => $p['id'], 'name' => $p['name'], 'stock' => $p['stock'], 'image' => $p['image'] ?? null, 'emoji' => $p['emoji'] ?? null, 'unit' => $p['unit']], array_slice($low, 0, 6)),
        'recentOrders' => array_slice($recent, 0, 6),
    ];
}
