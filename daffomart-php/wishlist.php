<?php
/*
 * wishlist.php  -  WISHLIST
 * The saved product ids live in the browser (localStorage, key "dm_wishlist").
 * JavaScript (main.js, section "wishlist page") asks api/products.php for those products and draws them.
 */
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'My wishlist';
$metaDesc  = 'Products you saved for later at ' . STORE_NAME . '.';
require __DIR__ . '/includes/header.php';
?>

<h1>My wishlist</h1>
<p class="muted">Tap the heart ♡ on any product to save it here. Your list is stored in this browser.</p>

<div id="wishlistGrid" class="product-grid" data-api="<?= e(url('api/products.php')) ?>" data-cart="<?= e(url('cart.php')) ?>"></div>

<div id="wishlistEmpty" class="empty card" hidden>
  <p class="big">♡</p>
  <h3>Your wishlist is empty</h3>
  <a class="btn btn-primary" href="<?= e(url('products.php')) ?>">Browse products</a>
</div>

<noscript><div class="alert alert-info">Please turn on JavaScript to see your wishlist.</div></noscript>

<?php require __DIR__ . '/includes/footer.php'; ?>
