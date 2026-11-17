<?php
/*
 * admin/export-orders.php  -  downloads orders as a CSV file (opens in Excel).
 * Optional filter: export-orders.php?status=pending
 */
require_once __DIR__ . '/_init.php';

$statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
$status = input_str($_GET, 'status');

$sql = "SELECT o.*, (SELECT GROUP_CONCAT(CONCAT(i.product_name, ' x', i.qty) SEPARATOR '; ')
                     FROM order_items i WHERE i.order_id = o.id) AS items_text
        FROM orders o";
$params = [];
if (in_array($status, $statuses, true)) {
    $sql .= ' WHERE o.status = ?';
    $params[] = $status;
}
$sql .= ' ORDER BY o.created_at DESC';
$st = db()->prepare($sql);
$st->execute($params);

// A cell that starts with = + - @ could run as a formula in Excel, so we put a ' in front
function csv_safe($value): string
{
    $text = (string)$value;
    return ($text !== '' && strpos('=+-@', $text[0]) !== false) ? "'" . $text : $text;
}

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="orders-' . date('Y-m-d') . '.csv"');

$out = fopen('php://output', 'w');
fwrite($out, "\xEF\xBB\xBF");                         // BOM so Excel reads Bangla/UTF-8 correctly
fputcsv($out, ['Order no', 'Date', 'Customer', 'Phone', 'Address', 'Area', 'Items', 'Subtotal', 'Coupon', 'Discount', 'Delivery', 'Total', 'Status']);
foreach ($st->fetchAll() as $o) {
    fputcsv($out, array_map('csv_safe', [
        $o['order_no'], $o['created_at'], $o['customer_name'], $o['phone'], $o['address'], $o['area'],
        $o['items_text'], $o['subtotal'], $o['coupon_code'] ?? '', $o['discount'], $o['delivery_charge'], $o['total'], $o['status'],
    ]));
}
fclose($out);
