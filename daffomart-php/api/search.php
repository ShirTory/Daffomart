<?php
/*
 * api/search.php?q=milk  -  returns JSON for the live search suggestions.
 * Called by JavaScript (assets/js/main.js, section "live search"), not opened by people.
 */
require_once __DIR__ . '/../includes/functions.php';
session_write_close();                       // we do not need the session here

$q = input_str($_GET, 'q');
if (text_len($q) < 2) {
    json_out(['items' => []]);
}

$st = db()->prepare(
    'SELECT name, slug, price, unit, emoji, image FROM products
     WHERE active = 1 AND (name LIKE ? OR generic_name LIKE ?)
     ORDER BY (name LIKE ?) DESC, name ASC LIMIT 6'
);
$st->execute(['%' . $q . '%', '%' . $q . '%', $q . '%']);

$items = [];
foreach ($st->fetchAll() as $p) {
    $items[] = [
        'name'  => $p['name'],
        'unit'  => $p['unit'],
        'price' => money($p['price']),
        'emoji' => $p['emoji'] ?: '🛒',
        'image' => $p['image'] ? url('uploads/' . $p['image']) : null,
        'url'   => url('product.php?slug=' . urlencode($p['slug'])),
    ];
}
json_out(['items' => $items]);
