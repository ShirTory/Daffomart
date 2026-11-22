<?php
/**
 * Which payment choices a customer may use right now.
 * Today: Cash on delivery + manual bKash/Nagad (customer sends money and enters the TrxID, admin verifies)
 * + any custom method added in Admin -> Payments.
 * "Online payment" is shown as "coming soon" until a payment gateway is connected (see PAYMENTS.md).
 */
function gateway_connected(): bool { return false; }

function payment_options(array $s): array {
    $o = [];
    if (!empty($s['payCod'])) $o[] = ['id' => 'cod', 'label' => 'Cash on delivery', 'hint' => 'Pay in cash when you receive your order.'];
    if (!empty($s['payBkash']) && !empty($s['bkashNumber'])) $o[] = ['id' => 'bkash', 'label' => 'bKash', 'hint' => 'Send money, then enter the TrxID.', 'number' => $s['bkashNumber']];
    if (!empty($s['payNagad']) && !empty($s['nagadNumber'])) $o[] = ['id' => 'nagad', 'label' => 'Nagad', 'hint' => 'Send money, then enter the TrxID.', 'number' => $s['nagadNumber']];
    if (!empty($s['payOnline'])) {
        $o[] = gateway_connected()
            ? ['id' => 'online', 'label' => 'Online payment', 'hint' => 'Card / mobile banking via secure payment page.']
            : ['id' => 'online', 'label' => 'Online payment', 'hint' => 'Card / mobile banking — coming soon.', 'disabled' => true];
    }
    try {
        $customs = array_filter(db_list('payment_methods'), fn($m) => !empty($m['active']));
        usort($customs, fn($a, $b) => ($a['sortOrder'] <=> $b['sortOrder']) ?: strcmp($a['label'], $b['label']));
        foreach ($customs as $m) {
            $o[] = ['id' => $m['id'], 'label' => $m['label'], 'hint' => $m['hint'] ?: (!empty($m['number']) ? 'Send money, then enter the TrxID.' : 'Follow the instructions at checkout.'),
                    'number' => $m['number'] ?? null, 'icon' => $m['icon'] ?? '💳', 'requireTrx' => ($m['requireTrx'] ?? true) !== false];
        }
    } catch (Throwable $e) { /* first run */ }
    // Admin -> Payments -> "How it looks": label, hint, logo, colour, order and visibility per method
    $d = is_array($s['payDisplay'] ?? null) ? $s['payDisplay'] : [];
    $o = array_values(array_filter($o, fn($x) => (($d[$x['id']]['visible'] ?? true) !== false)));
    $o = array_map(function ($x) use ($d) {
        $c = $d[$x['id']] ?? [];
        if (!empty($c['label'])) $x['label'] = $c['label'];
        if (!empty($c['hint'])) $x['hint'] = $c['hint'];
        if (!empty($c['logo'])) $x['logo'] = $c['logo'];
        if (!empty($c['color'])) $x['color'] = $c['color'];
        return clean_nulls($x);
    }, $o);
    usort($o, fn($a, $b) => ($d[$a['id']]['order'] ?? 50) <=> ($d[$b['id']]['order'] ?? 50));
    return $o;
}
