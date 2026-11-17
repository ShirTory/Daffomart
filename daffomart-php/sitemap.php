<?php
/*
 * sitemap.php  -  XML sitemap for Google (open /sitemap.php, then submit it in Google Search Console).
 */
require_once __DIR__ . '/includes/functions.php';
session_write_close();

$origin = site_origin();
$pages = ['index.php', 'products.php', 'products.php?kind=medicine', 'track.php', 'contact.php', 'policy.php', 'join.php'];

header('Content-Type: application/xml; charset=utf-8');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

foreach ($pages as $page) {
    echo '  <url><loc>' . e($origin . url($page)) . '</loc></url>' . "\n";
}

foreach (db()->query('SELECT slug, created_at FROM products WHERE active = 1 ORDER BY id')->fetchAll() as $p) {
    echo '  <url><loc>' . e($origin . url('product.php?slug=' . urlencode($p['slug']))) . '</loc>'
       . '<lastmod>' . e(date('Y-m-d', strtotime($p['created_at']))) . '</lastmod></url>' . "\n";
}
echo '</urlset>' . "\n";
