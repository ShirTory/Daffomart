<?php
/*
 * header.php  -  the top part of every public page (<head>, announcement bar, navbar).
 * A page can set these variables BEFORE including this file:
 *   $pageTitle  (page name)   $metaDesc (search-engine description)
 *   $ogImage    (share image) $jsonLd   (structured data, used on product pages)
 */
require_once __DIR__ . '/functions.php';
$user = current_user();
$pageTitle = $pageTitle ?? STORE_NAME;
$metaDesc  = $metaDesc ?? (STORE_NAME . ' - order groceries and medicine online in Dhaka. Fresh food, daily needs and trusted medicine with cash on delivery.');
$origin    = site_origin();
$canonical = $origin . (parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
if (!empty($canonicalQuery)) {
    $canonical .= '?' . $canonicalQuery;
}
$ogImage   = $ogImage ?? ($origin . url('assets/img/logo.png'));
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= e($pageTitle) ?> | <?= e(STORE_NAME) ?></title>
  <meta name="description" content="<?= e($metaDesc) ?>">
  <link rel="canonical" href="<?= e($canonical) ?>">
  <meta name="theme-color" content="#1e3a8a">
  <meta name="csrf-token" content="<?= e(csrf_token()) ?>">

  <!-- Social sharing (Facebook, WhatsApp...) -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="<?= e(STORE_NAME) ?>">
  <meta property="og:title" content="<?= e($pageTitle) ?> | <?= e(STORE_NAME) ?>">
  <meta property="og:description" content="<?= e($metaDesc) ?>">
  <meta property="og:url" content="<?= e($canonical) ?>">
  <meta property="og:image" content="<?= e($ogImage) ?>">

  <link rel="icon" href="<?= e(url('assets/img/favicon.ico')) ?>">
  <!-- Set dark/light theme BEFORE the page is drawn, so there is no white flash -->
  <script>
    (function () {
      try {
        var t = localStorage.getItem('dm_theme');
        if (!t) { t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
        document.documentElement.setAttribute('data-theme', t);
      } catch (err) { /* private mode: keep light theme */ }
    })();
  </script>
  <link rel="stylesheet" href="<?= e(url('assets/css/style.css')) ?>">
  <?php if (!empty($jsonLd)): ?>
  <script type="application/ld+json"><?= $jsonLd ?></script>
  <?php endif; ?>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<!-- Announcement bar -->
<div class="topbar">Everyday essentials, delivered with care &middot; Cash on delivery available</div>

<!-- Navigation bar -->
<header class="site-header">
  <div class="container nav">
    <a class="brand" href="<?= e(url('index.php')) ?>">
      <img src="<?= e(url('assets/img/logo.png')) ?>" alt="<?= e(STORE_NAME) ?> logo">
    </a>

    <!-- Search form (GET: keyword goes into the URL as ?q=...). JavaScript adds live suggestions under it. -->
    <form class="search" role="search" method="get" action="<?= e(url('products.php')) ?>" data-suggest-url="<?= e(url('api/search.php')) ?>">
      <input type="search" name="q" id="searchInput" placeholder="Search groceries or medicine..." autocomplete="off"
             value="<?= e(input_str($_GET, 'q')) ?>" aria-label="Search products">
      <button type="submit">Search</button>
      <ul class="suggest" id="suggest" hidden></ul>
    </form>

    <button class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false">&#9776;</button>

    <nav class="nav-links" id="navLinks" aria-label="Main menu">
      <a href="<?= e(url('index.php')) ?>">Home</a>
      <a href="<?= e(url('products.php')) ?>">Shop</a>
      <a href="<?= e(url('products.php?kind=medicine')) ?>">Medicine</a>
      <a href="<?= e(url('track.php')) ?>">Track order</a>
      <a href="<?= e(url('contact.php')) ?>">Contact</a>
      <?php if ($user): ?>
        <a href="<?= e(url('account.php')) ?>">My orders</a>
        <a href="<?= e(url('logout.php')) ?>">Logout</a>
      <?php else: ?>
        <a href="<?= e(url('login.php')) ?>">Login</a>
      <?php endif; ?>
      <a href="<?= e(url('wishlist.php')) ?>" aria-label="Wishlist">♡ <span class="wish-count">0</span></a>
      <button type="button" class="icon-btn" id="themeToggle" aria-label="Switch dark / light mode">🌙</button>
      <a class="cart-link" href="<?= e(url('cart.php')) ?>">Cart <span class="cart-count"><?= (int)cart_count() ?></span></a>
    </nav>
  </div>
</header>

<main class="container main" id="main">
<?php show_flash(); ?>
