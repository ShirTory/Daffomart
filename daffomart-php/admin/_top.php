<?php
/*
 * admin/_top.php  -  start of every admin page: <head> + sidebar.
 * Files that start with "_" are only included by other files, never opened directly.
 */
require_once __DIR__ . '/_init.php';
$adminPage = $adminPage ?? '';
$pageTitle = $pageTitle ?? 'Admin';

function admin_link(string $file, string $label, string $key, string $current): string
{
    return '<a class="' . ($key === $current ? 'active' : '') . '" href="' . e(url('admin/' . $file)) . '">' . e($label) . '</a>';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><?= e($pageTitle) ?> | Admin - <?= e(STORE_NAME) ?></title>
  <link rel="icon" href="<?= e(url('assets/img/favicon.ico')) ?>">
  <script>
    (function () {
      try { document.documentElement.setAttribute('data-theme', localStorage.getItem('dm_theme') || 'light'); } catch (err) {}
    })();
  </script>
  <link rel="stylesheet" href="<?= e(url('assets/css/style.css')) ?>">
</head>
<body class="admin-body">
<div class="admin-wrap">
  <aside class="admin-side">
    <h2><?= e(STORE_NAME) ?> Admin</h2>
    <?= admin_link('index.php', 'Dashboard', 'dashboard', $adminPage) ?>
    <?= admin_link('orders.php', 'Orders', 'orders', $adminPage) ?>
    <?= admin_link('products.php', 'Products', 'products', $adminPage) ?>
    <?= admin_link('categories.php', 'Categories', 'categories', $adminPage) ?>
    <?= admin_link('coupons.php', 'Coupons', 'coupons', $adminPage) ?>
    <?= admin_link('applications.php', 'Rider applications', 'applications', $adminPage) ?>
    <?= admin_link('password.php', 'Change password', 'password', $adminPage) ?>
    <a href="<?= e(url('index.php')) ?>" target="_blank" rel="noopener">View website</a>
    <a href="<?= e(url('admin/logout.php')) ?>">Logout (<?= e($admin['name']) ?>)</a>
  </aside>
  <main class="admin-main">
    <?php show_flash(); ?>
