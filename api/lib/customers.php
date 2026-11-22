<?php
/**
 * Customer database (CRM). One record per customer, keyed by the phone number (01XXXXXXXXX): the id IS the phone,
 * so two records for one number cannot exist. The numbers on a record (order count, total spent ...) are always
 * recomputed from the customer's real orders, never incremented, so a retry can never count twice.
 */
const CRM_RULES = ['vipSpend' => 20000, 'vipOrders' => 10, 'regularOrders' => 3, 'inactiveDays' => 90];

function customer_blank(string $phone, string $name, string $source): array {
    $n = now_iso();
    return ['id' => $phone, 'phone' => $phone, 'name' => $name, 'followUps' => [], 'status' => 'active', 'source' => $source, 'orderCount' => 0, 'totalSpent' => 0, 'createdAt' => $n, 'updatedAt' => $n];
}

function segment_of(array $c): string {
    if (!empty($c['segmentOverride'])) return $c['segmentOverride'];
    if (($c['orderCount'] ?? 0) > 0 && !empty($c['lastOrderAt']) && time() - iso_to_ts($c['lastOrderAt']) > CRM_RULES['inactiveDays'] * 86400) return 'inactive';
    if (($c['totalSpent'] ?? 0) >= CRM_RULES['vipSpend'] || ($c['orderCount'] ?? 0) >= CRM_RULES['vipOrders']) return 'vip';
    if (($c['orderCount'] ?? 0) >= CRM_RULES['regularOrders']) return 'regular';
    return 'new';
}

/** Recompute a customer's numbers from their real orders (cancelled/returned orders are not counted). */
function recompute_customer_stats(string $phone): ?array {
    $orders = array_values(array_filter(db_find('orders', 'phone', $phone), fn($o) => !in_array($o['status'], ['cancelled', 'returned'], true)));
    $dates = array_column($orders, 'createdAt'); sort($dates);
    $stats = ['orderCount' => count($orders), 'totalSpent' => (int)round(array_sum(array_map(fn($o) => (float)($o['total'] ?? 0), $orders))),
              'firstOrderAt' => $dates[0] ?? null, 'lastOrderAt' => $dates ? end($dates) : null];
    return db_mutate('customers', $phone, fn($cur) => $cur ? array_merge($cur, $stats, ['updatedAt' => now_iso()]) : null);
}

/** Called after an order is saved: create the customer if new, refresh contact details, recompute totals. */
function record_order_customer(array $o): ?array {
    $phone = normalize_bd_phone($o['phone'] ?? null);
    if (!$phone) return null;
    db_create('customers', array_merge(customer_blank($phone, $o['name'], 'order'), ['address' => $o['address'] ?? '', 'area' => $o['zoneName'] ?? '']));
    db_mutate('customers', $phone, fn($cur) => $cur ? array_merge($cur, [
        'name' => $cur['name'] ?: $o['name'], 'address' => ($o['address'] ?? '') ?: ($cur['address'] ?? ''), 'area' => ($o['zoneName'] ?? '') ?: ($cur['area'] ?? ''), 'updatedAt' => now_iso(),
    ]) : null);
    return recompute_customer_stats($phone);
}

/** Checkout guard: the admin can block a customer. */
function assert_customer_may_order(string $phone): void {
    $c = db_get('customers', $phone);
    if ($c && ($c['status'] ?? '') === 'blocked') throw new ApiError(403, 'We cannot accept this order online. Please call us to place it.');
}

function customer_present(array $c): array { $c['followUps'] = $c['followUps'] ?? []; $c['segment'] = segment_of($c); return $c; }
