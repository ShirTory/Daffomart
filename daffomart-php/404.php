<?php
/*
 * 404.php  -  "page not found" page. Other pages include it when something does not exist
 * (for example product.php with a wrong slug).
 */
require_once __DIR__ . '/includes/functions.php';

http_response_code(404);
$pageTitle = 'Page not found';
$metaDesc  = 'This page could not be found.';
require __DIR__ . '/includes/header.php';
?>

<div class="empty card">
  <p class="big">🧭</p>
  <h1>Page not found</h1>
  <p class="muted">The page or product you are looking for does not exist or was removed.</p>
  <a class="btn btn-primary" href="<?= e(url('products.php')) ?>">Browse products</a>
  <a class="btn btn-outline" href="<?= e(url('index.php')) ?>">Go home</a>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
