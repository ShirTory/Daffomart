<?php
/**
 * All the API addresses ("routes"). Each line says: HTTP method, address pattern, and the function that answers.
 * {id} in a pattern is a changing part of the address. Every answer looks like {"ok":true,"data":...}.
 */

function q(string $k, string $d = ''): string { return isset($_GET[$k]) ? trim((string)$_GET[$k]) : $d; }
function actor_audit(array $a, string $action, ?string $target = null, ?string $detail = null): void {
    log_audit(['actor' => $a['email'], 'actorRole' => $a['adminRole'], 'action' => $action, 'target' => $target, 'detail' => $detail, 'ip' => client_ip()]);
}

/** Public list of one resource (only what visitors may see). */
function public_list(string $name): array {
    $cfg = resource_cfg($name);
    $items = db_list($cfg['col']);
    if (isset($cfg['visible'])) $items = array_values(array_filter($items, $cfg['visible']));
    if (isset($cfg['sort'])) usort($items, $cfg['sort']);
    return array_map(crud_out($cfg, null), $items);
}

/* ---------- customers (CRM) ---------- */
function customer_input(array $in, bool $creating): array {
    $v = new Validator($in); $o = [];
    if ($creating || $v->has('name')) $o['name'] = $v->str('name', 2, 80, '', 'Enter the customer name');
    if ($creating) {
        $p = normalize_bd_phone($in['phone'] ?? null);
        if (!$p) $v->add('phone', 'Enter a valid mobile number (01XXXXXXXXX)'); else $o['phone'] = $p;
    }
    foreach (['whatsapp' => 20, 'email' => 120, 'address' => 300, 'area' => 80, 'notes' => 1000] as $k => $max) if (array_key_exists($k, $in)) $o[$k] = $v->str($k, 0, $max);
    if (!empty($o['email']) && !filter_var($o['email'], FILTER_VALIDATE_EMAIL)) $v->add('email', 'Enter a valid email');
    if (array_key_exists('status', $in)) $o['status'] = $v->enum('status', ['active', 'blocked'], 'active');
    if (array_key_exists('segmentOverride', $in)) $o['segmentOverride'] = $v->enum('segmentOverride', ['new', 'regular', 'vip', 'inactive']) ?: null;
    $v->done();
    return $o;
}
function sanitize_follow_ups(array $list): array {
    $out = [];
    foreach (array_slice($list, 0, 100) as $x) {
        $text = trim(mb_substr((string)($x['text'] ?? ''), 0, 500)); if ($text === '') continue;
        $out[] = ['id' => preg_match('/^[a-f0-9]{16}$/', (string)($x['id'] ?? '')) ? $x['id'] : new_id(), 'text' => $text,
                  'dueAt' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($x['dueAt'] ?? '')) ? $x['dueAt'] : null, 'done' => !empty($x['done']),
                  'by' => mb_substr((string)($x['by'] ?? 'admin'), 0, 120), 'at' => (!empty($x['at']) && strtotime((string)$x['at'])) ? $x['at'] : now_iso()];
    }
    return array_map('clean_nulls', $out);
}
function customer_id_param(string $id): string { $p = normalize_bd_phone($id); if (!$p) throw new ApiError(400, 'Invalid customer id'); return $p; }

/* ---------- the route table ---------- */
function routes(): array {
    return [
    ['GET', '/health', function () { ok(['status' => 'ok', 'time' => now_iso()]); }],

    // one call that gives the storefront everything it needs to draw the home page
    ['GET', '/store', function () {
        $s = get_settings();
        ok(['settings' => $s, 'categories' => public_list('categories'), 'banners' => public_list('banners'), 'offers' => public_list('offers'),
            'zones' => get_zones(), 'paymentOptions' => payment_options($s)]);
    }],

    /* --- login --- */
    ['POST', '/auth/login', function () {
        rate_limit('login:' . client_ip(), 8, 600);
        $d = schema_login(read_json());
        rate_limit('login-acct:' . $d['email'], 10, 900);
        $s = authenticate_admin($d['email'], $d['password']);
        if (!$s) throw new ApiError(401, 'Incorrect email or password');
        log_audit(['actor' => $s['email'], 'actorRole' => $s['adminRole'], 'action' => 'admin.login', 'detail' => 'fullAccess=' . ($s['fullAccess'] ? 'true' : 'false'), 'ip' => client_ip()]);
        ok(['token' => create_session_token($s), 'email' => $s['email'], 'adminRole' => $s['adminRole'], 'fullAccess' => $s['fullAccess']]);
    }],
    ['GET', '/auth/me', function () { $a = get_admin(); ok($a ? ['email' => $a['email'], 'adminRole' => $a['adminRole'], 'fullAccess' => $a['fullAccess']] : null); }],
    ['POST', '/auth/logout', function () { ok(['loggedOut' => true]); }],   // the token just gets forgotten by the browser

    /* --- products --- */
    ['GET', '/products', function () {
        $admin = get_full_admin(); $cfg = resource_cfg('products');
        $list = db_list('products');
        if (!$admin) $list = array_values(array_filter($list, $cfg['visible']));
        $ids = array_slice(array_filter(explode(',', q('ids'))), 0, 100);
        if ($ids) $list = array_values(array_filter($list, fn($p) => in_array($p['id'], $ids, true)));
        $text = mb_strtolower(q('q')); $cat = q('cat'); $max = (float)q('max'); $min = (float)q('min');
        if ($text !== '') $list = array_values(array_filter($list, fn($p) => str_contains(mb_strtolower($p['name']), $text) || str_contains(mb_strtolower($p['description'] ?? ''), $text)));
        if ($cat !== '') $list = array_values(array_filter($list, fn($p) => ($p['categoryId'] ?? '') === $cat));
        if ($max) $list = array_values(array_filter($list, fn($p) => $p['price'] <= $max));
        if ($min) $list = array_values(array_filter($list, fn($p) => $p['price'] >= $min));
        if (q('featured')) $list = array_values(array_filter($list, fn($p) => !empty($p['featured'])));
        if (q('sale')) $list = array_values(array_filter($list, fn($p) => !empty($p['oldPrice']) && $p['oldPrice'] > $p['price']));
        $sorts = ['price_asc' => fn($a, $b) => $a['price'] <=> $b['price'], 'price_desc' => fn($a, $b) => $b['price'] <=> $a['price'],
                  'popular' => fn($a, $b) => ($b['sold'] ?? 0) <=> ($a['sold'] ?? 0), 'newest' => fn($a, $b) => strcmp($b['createdAt'] ?? '', $a['createdAt'] ?? '')];
        usort($list, $sorts[q('sort', 'newest')] ?? $sorts['newest']);
        $total = count($list);
        $limit = min(max((int)q('limit') ?: 100, 1), 500); $page = max((int)q('page') ?: 1, 1);
        $list = array_slice($list, ($page - 1) * $limit, $limit);
        ok(['items' => array_map(crud_out($cfg, $admin), $list), 'total' => $total, 'page' => $page, 'limit' => $limit]);
    }],
    ['POST', '/products', fn() => crud_create(resource_cfg('products'))],
    ['GET', '/products/{id}', function ($p) {   // by id OR by slug (the shop's product page uses the slug)
        $cfg = resource_cfg('products'); $admin = get_full_admin();
        $item = db_get('products', $p['id']) ?? (db_find('products', 'slug', $p['id'])[0] ?? null);
        if (!$item || (!$admin && empty($item['active']))) throw new ApiError(404, 'Product not found');
        ok(crud_out($cfg, $admin)($item));
    }],
    ['PUT', '/products/{id}', fn($p) => crud_update(resource_cfg('products'), $p['id'])],
    ['DELETE', '/products/{id}', fn($p) => crud_delete(resource_cfg('products'), $p['id'])],

    /* --- categories, banners, offers, zones, couriers, payment methods: same 5 actions each --- */
    ['POST', '/categories/reorder', function () {
        require_admin();
        $ids = read_json()['ids'] ?? [];
        if (!is_array($ids) || !$ids || count($ids) > 500) throw new ApiError(400, 'Send the list of category ids');
        $all = db_list('categories'); usort($all, fn($a, $b) => ($a['sortOrder'] <=> $b['sortOrder']) ?: strcmp($a['name'], $b['name']));
        $known = array_column($all, null, 'id');
        $first = array_values(array_filter(array_unique($ids), fn($i) => isset($known[$i])));
        $order = array_merge($first, array_values(array_filter(array_keys($known), fn($i) => !in_array($i, $first, true))));
        $out = [];
        foreach ($order as $n => $id) { if (($known[$id]['sortOrder'] ?? 0) !== $n + 1) db_update('categories', $id, ['sortOrder' => $n + 1]); $out[] = array_merge($known[$id], ['sortOrder' => $n + 1]); }
        ok($out);
    }],
    ] + [];
}

/** Adds the standard 5 routes for a simple resource. */
function resource_routes(string $name): array {
    return [
        ['GET', "/$name", fn() => crud_list(resource_cfg($name))],
        ['POST', "/$name", fn() => crud_create(resource_cfg($name))],
        ['GET', "/$name/{id}", fn($p) => crud_get(resource_cfg($name), $p['id'])],
        ['PUT', "/$name/{id}", fn($p) => crud_update(resource_cfg($name), $p['id'])],
        ['DELETE', "/$name/{id}", fn($p) => crud_delete(resource_cfg($name), $p['id'])],
    ];
}

function more_routes(): array {
    $r = [];
    foreach (['categories', 'banners', 'offers', 'zones', 'couriers', 'payment-methods'] as $n) $r = array_merge($r, resource_routes($n));
    return array_merge($r, [

    /* --- settings --- */
    ['GET', '/settings', fn() => ok(get_settings())],
    ['PUT', '/settings', function () {
        $a = require_admin();
        $data = schema_settings_patch(read_json());
        $cur = db_get('settings', 'store') ?? ['id' => 'store'];
        db_put('settings', array_merge($cur, $data, ['id' => 'store']));
        actor_audit($a, 'settings.update', 'store', implode(',', array_keys($data)));
        ok(get_settings());
    }],

    /* --- coupon check at checkout --- */
    ['POST', '/coupons/validate', function () {
        rate_limit('coupon:' . client_ip(), 30, 600);
        $in = read_json(); $code = strtoupper(trim((string)($in['code'] ?? ''))); $sub = (float)($in['subtotal'] ?? 0);
        if ($code === '' || strlen($code) > 24) throw new ApiError(400, 'Enter a coupon code');
        $r = evaluate_coupon($code, $sub);
        ok(['code' => $r['offer']['code'], 'title' => $r['offer']['title'], 'discount' => $r['discount']]);
    }],

    /* --- orders --- */
    ['POST', '/orders', function () {
        rate_limit('order:' . client_ip(), 40, 600);
        $in = read_json();
        $d = schema_order_create($in);
        rate_limit('order-phone:' . $d['phone'], 5, 600);
        $o = create_order($d);
        ok($o, 201);
    }],
    ['GET', '/orders', function () {
        require_admin();
        $list = db_list('orders'); $st = q('status'); $text = mb_strtolower(q('q'));
        if ($st !== '') $list = array_values(array_filter($list, fn($o) => $o['status'] === $st));
        if ($text !== '') $list = array_values(array_filter($list, fn($o) => str_contains(mb_strtolower($o['orderNo'] . ' ' . $o['name'] . ' ' . $o['phone']), $text)));
        usort($list, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
        ok(array_slice($list, 0, 500));
    }],
    ['GET', '/orders/my', function () {
        rate_limit('myorders:' . client_ip(), 15, 600);
        $phone = norm_phone(q('phone'));
        if (!preg_match('/^01[3-9]\d{8}$/', $phone)) throw new ApiError(400, 'Enter a valid mobile number (01XXXXXXXXX)');
        $list = db_find('orders', 'phone', $phone); usort($list, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
        ok(array_map(fn($o) => ['orderNo' => $o['orderNo'], 'status' => $o['status'], 'createdAt' => $o['createdAt'], 'total' => $o['total'],
            'itemCount' => array_sum(array_column($o['items'], 'qty')),
            'items' => array_map(fn($i) => clean_nulls(['id' => $i['id'], 'name' => $i['name'], 'qty' => $i['qty'], 'price' => $i['price'], 'unit' => $i['unit'] ?? null, 'image' => $i['image'] ?? null, 'emoji' => $i['emoji'] ?? null]), $o['items']),
            'riderName' => $o['riderName'] ?? null, 'payment' => $o['payment'] ?? null, 'paymentStatus' => $o['paymentStatus'] ?? null], array_slice($list, 0, 20)));
    }],
    ['GET', '/orders/track', function () {
        rate_limit('track:' . client_ip(), 20, 600);
        $no = strtoupper(q('no')); $phone = norm_phone(q('phone'));
        if ($no === '' || $phone === '') throw new ApiError(400, 'Enter your order number and phone number');
        $o = null; foreach (db_find('orders', 'orderNo', $no) as $x) if ($x['phone'] === $phone) $o = $x;
        if (!$o) throw new ApiError(404, 'No order found with these details');
        $zone = !empty($o['zone']) ? db_get('zones', $o['zone']) : null;
        $age = time() - iso_to_ts($o['createdAt']);
        $canCancel = $o['status'] === 'pending' && $age <= 120;
        $items = array_map(function ($i) { unset($i['cost']); return $i; }, $o['items']);
        ok(clean_nulls([
            'id' => $o['id'], 'orderNo' => $o['orderNo'], 'status' => $o['status'], 'createdAt' => $o['createdAt'], 'updatedAt' => $o['updatedAt'] ?? null,
            'items' => $items, 'subtotal' => $o['subtotal'], 'delivery' => $o['delivery'], 'serviceCharge' => $o['serviceCharge'] ?? 0, 'discount' => $o['discount'], 'total' => $o['total'],
            'payment' => $o['payment'] ?? null, 'paymentStatus' => $o['paymentStatus'] ?? null, 'zoneName' => $o['zoneName'] ?? null, 'eta' => $zone['eta'] ?? null,
            'canCancel' => $canCancel, 'cancelEndsAt' => $canCancel ? gmdate('Y-m-d\TH:i:s.000\Z', iso_to_ts($o['createdAt']) + 120) : null,
            'courierName' => $o['courierName'] ?? null, 'trackingNo' => $o['trackingNo'] ?? null, 'courierUrl' => $o['courierUrl'] ?? null,
            'riderName' => $o['riderName'] ?? null, 'riderPhone' => $o['riderPhone'] ?? null, 'rated' => false, 'existingRating' => null, 'issues' => [],
        ]));
    }],
    ['POST', '/orders/cancel', function () {
        rate_limit('cancel:' . client_ip(), 5, 600);
        $in = read_json(); $no = strtoupper(trim((string)($in['no'] ?? ''))); $phone = norm_phone(trim((string)($in['phone'] ?? '')));
        if ($no === '' || $phone === '') throw new ApiError(400, 'Enter your order number and phone number');
        $o = null; foreach (db_find('orders', 'orderNo', $no) as $x) if ($x['phone'] === $phone) $o = $x;
        if (!$o) throw new ApiError(404, 'No order found with these details');
        if ($o['status'] !== 'pending') throw new ApiError(400, 'Only pending orders can be cancelled');
        if (time() - iso_to_ts($o['createdAt']) > 120) throw new ApiError(400, 'Cancellation window has closed (available only within 2 minutes of placing the order)');
        $u = set_order_status($o['id'], 'cancelled');
        ok(['orderNo' => $u['orderNo'], 'status' => $u['status']]);
    }],
    ['GET', '/orders/{id}', function ($p) { require_admin(); $o = db_get('orders', $p['id']); if (!$o) throw new ApiError(404, 'Order not found'); ok($o); }],
    ['PATCH', '/orders/{id}', function ($p) {
        $a = require_admin(); $id = $p['id'];
        $d = schema_order_patch(read_json()); $o = null;
        if ($d['riderId'] !== null) $o = assign_rider($id, $d['riderId']);
        if ($d['courierId'] !== null || $d['trackingNo'] !== null) $o = set_courier($id, $d['courierId'], $d['trackingNo']);
        if ($d['status'] !== null) { $o = set_order_status($id, $d['status']); actor_audit($a, 'order.status', $id, $d['status']); }
        if ($d['paymentStatus'] !== null) $o = set_payment_status($id, $d['paymentStatus']);
        ok($o);
    }],
    ['DELETE', '/orders/{id}', function ($p) {
        $a = require_admin(); if (!db_get('orders', $p['id'])) throw new ApiError(404, 'Order not found');
        db_remove('orders', $p['id']); actor_audit($a, 'order.delete', $p['id']); ok(['id' => $p['id']]);
    }],

    /* --- admin numbers --- */
    ['GET', '/admin/stats', function () { require_admin(); ok(dashboard_stats(min(60, max(7, (int)q('days', '14'))))); }],
    ['GET', '/admin/inventory', function () {
        require_admin(); $l = db_list('stocklogs'); usort($l, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt'])); ok(array_slice($l, 0, 60));
    }],
    ['POST', '/admin/inventory', function () {
        require_admin(); $in = read_json(); $v = new Validator($in);
        $pid = $v->str('productId', 1, 80); $mode = $v->enum('mode', ['add', 'remove', 'set'], 'add'); $qty = $v->int('qty', 0, 1000000, 0);
        $reason = $v->str('reason', 0, 120); $vid = $v->optStr('variantId', 40); $v->done();
        ok(adjust_stock($pid, $mode, $qty, $reason, $vid));
    }],

    /* --- customers (CRM) --- */
    ['GET', '/admin/customers', function () {
        require_admin(); $all = db_list('customers'); $text = mb_strtolower(q('q')); $digits = preg_replace('/\D/', '', $text);
        $view = array_map('customer_present', $all);
        $items = array_values(array_filter($view, fn($c) => (q('segment') === '' || $c['segment'] === q('segment')) && (q('status') === '' || ($c['status'] ?? '') === q('status'))
            && (q('area') === '' || mb_strtolower($c['area'] ?? '') === mb_strtolower(q('area')))
            && ($text === '' || str_contains(mb_strtolower($c['name']), $text) || (strlen($digits) >= 3 && str_contains($c['phone'], $digits)) || str_contains(mb_strtolower($c['address'] ?? ''), $text))));
        usort($items, fn($a, $b) => strcmp($b['lastOrderAt'] ?? $b['createdAt'], $a['lastOrderAt'] ?? $a['createdAt']));
        $seg = ['new' => 0, 'regular' => 0, 'vip' => 0, 'inactive' => 0]; foreach ($view as $c) $seg[$c['segment']]++;
        $areas = array_values(array_unique(array_filter(array_column($all, 'area')))); sort($areas);
        ok(['items' => array_slice($items, 0, 1000), 'total' => count($all), 'matched' => count($items), 'segments' => $seg, 'areas' => $areas, 'spent' => array_sum(array_column($all, 'totalSpent'))]);
    }],
    ['POST', '/admin/customers', function () {
        $a = require_admin(); $d = customer_input(read_json(), true);
        $rec = array_merge(customer_blank($d['phone'], $d['name'], 'manual'), $d);
        if (!db_create('customers', $rec)) throw new ApiError(409, 'A customer with this phone number already exists');
        actor_audit($a, 'customer.create', $d['phone']);
        ok(customer_present(recompute_customer_stats($d['phone']) ?? $rec), 201);
    }],
    ['GET', '/admin/customers/{id}', function ($p) {
        require_admin(); $id = customer_id_param($p['id']); $c = db_get('customers', $id); if (!$c) throw new ApiError(404, 'Customer not found');
        $orders = db_find('orders', 'phone', $id); usort($orders, fn($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
        ok(['customer' => customer_present($c), 'orders' => array_map(fn($o) => ['id' => $o['id'], 'orderNo' => $o['orderNo'], 'status' => $o['status'], 'total' => $o['total'], 'createdAt' => $o['createdAt']], $orders)]);
    }],
    ['PUT', '/admin/customers/{id}', function ($p) {
        $a = require_admin(); $id = customer_id_param($p['id']); $in = read_json(); $d = customer_input($in, false);
        if (isset($in['followUps']) && is_array($in['followUps'])) $d['followUps'] = sanitize_follow_ups($in['followUps']);
        $next = db_mutate('customers', $id, fn($cur) => $cur ? array_merge($cur, $d, ['updatedAt' => now_iso()]) : null);
        if (!$next) throw new ApiError(404, 'Customer not found');
        actor_audit($a, 'customer.update', $id, implode(',', array_keys($d)));
        ok(customer_present(recompute_customer_stats($id) ?? $next));
    }],
    ['DELETE', '/admin/customers/{id}', function ($p) {
        $a = require_owner(); $id = customer_id_param($p['id']); if (!db_get('customers', $id)) throw new ApiError(404, 'Customer not found');
        db_remove('customers', $id); actor_audit($a, 'customer.delete', $id); ok(['id' => $id]);
    }],
    ['GET', '/admin/audit', function () {
        require_owner(); $l = db_list('audit_logs'); usort($l, fn($a, $b) => strcmp($b['at'], $a['at'])); ok(array_slice($l, 0, 200));
    }],

    /* --- picture upload --- */
    ['POST', '/upload', function () {
        require_admin(); rate_limit('upload:' . client_ip(), 60, 600);
        if (empty($_FILES['file'])) throw new ApiError(400, 'No image file received');
        ok(save_uploaded_image($_FILES['file'], (string)($_POST['kind'] ?? 'general')), 201);
    }],
    ]);
}

/** Finds the matching route and runs it. */
function dispatch(string $method, string $path): void {
    foreach (array_merge(routes(), more_routes()) as [$m, $pattern, $fn]) {
        if ($m !== $method) continue;
        $re = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $pattern) . '/?$#';
        if (preg_match($re, $path, $mm)) { $fn(array_map('urldecode', array_filter($mm, 'is_string', ARRAY_FILTER_USE_KEY))); return; }
    }
    throw new ApiError(404, 'Not found');
}
