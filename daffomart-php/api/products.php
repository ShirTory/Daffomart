<?php
/*
 * api/products.php?ids=1,2,3  -  returns JSON details of some products.
 * Used by the wishlist page (the wishlist ids are saved in the browser's localStorage).
 */
require_once __DIR__ . '/../includes/functions.php';
session_write_close();

$ids = [];
foreach (explode(',', input_str($_GET, 'ids')) as $part) {
    $n = (int)$part;
    if ($n > 0) {
        $ids[$n] = $n;
    }
}
$ids = array_slice(array_values($ids), 0, 50);
if (!$ids) {
    json_out(['items' => []]);
}

$marks = implode(',', array_fill(0, count($ids), '?'));
$st = db()->prepare("SELECT * FROM products WHERE active = 1 AND id IN ($marks)");
$st->execute($ids);

$items = [];
foreach ($st->fetchAll() as $p) {
    $sale = $p['old_price'] && (float)$p['old_price'] > (float)$p['price'];
    $items[] = [
        'id'        => (int)$p['id'],
        'name'      => $p['name'],
        'unit'      => $p['unit'],
        'price'     => money($p['price']),
        'old_price' => $sale ? money($p['old_price']) : null,
        'emoji'     => $p['emoji'] ?: '🛒',
        'image'     => $p['image'] ? url('uploads/' . $p['image']) : null,
        'in_stock'  => (int)$p['stock'] > 0,
        'is_rx'     => (bool)$p['is_rx'],
        'url'       => url('product.php?slug=' . urlencode($p['slug'])),
    ];
}
json_out(['items' => $items]);
