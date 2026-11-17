<?php
/*
 * index.php  -  HOME PAGE
 * Shows: hero banner, feature boxes, category list, featured products, medicine products.
 */
require_once __DIR__ . '/includes/functions.php';

$pdo = db();

// All active categories (for the category boxes)
$categories = $pdo->query('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, name')->fetchAll();

// Featured grocery products
$featured = $pdo->query(
    "SELECT p.* FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.active = 1 AND p.featured = 1 AND c.kind = 'grocery'
     ORDER BY p.created_at DESC LIMIT 8"
)->fetchAll();

// Medicine products
$medicine = $pdo->query(
    "SELECT p.* FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.active = 1 AND c.kind = 'medicine'
     ORDER BY p.created_at DESC LIMIT 4"
)->fetchAll();

$pageTitle = 'Groceries & Medicine Delivered';
require __DIR__ . '/includes/header.php';
?>

<!-- HERO -->
<section class="hero">
  <div>
    <h1>Groceries &amp; medicine,<br>delivered to your door.</h1>
    <p>Fresh food, daily needs and trusted medicine - order online, pay on delivery.</p>
    <a class="btn btn-accent" href="<?= e(url('products.php')) ?>">Shop now</a>
    <a class="btn btn-light" href="<?= e(url('products.php?kind=medicine')) ?>">Order medicine</a>
  </div>
</section>

<!-- FEATURE BOXES -->
<section class="features">
  <div class="feature"><span>🚚</span><strong>Fast delivery</strong><small>Same-day in Dhaka</small></div>
  <div class="feature"><span>🌿</span><strong>Always fresh</strong><small>Quality checked</small></div>
  <div class="feature"><span>💵</span><strong>Cash on delivery</strong><small>Pay when you receive</small></div>
  <div class="feature"><span>🏷️</span><strong>Best prices</strong><small>Daily offers</small></div>
</section>

<!-- CATEGORIES -->
<section>
  <h2 class="section-title">Shop by category</h2>
  <div class="category-grid">
    <?php foreach ($categories as $c): ?>
      <a class="category-box" href="<?= e(url('products.php?cat=' . urlencode($c['slug']))) ?>">
        <span class="cat-emoji"><?= e($c['emoji']) ?></span>
        <span><?= e($c['name']) ?></span>
      </a>
    <?php endforeach; ?>
  </div>
</section>

<!-- FEATURED PRODUCTS -->
<section>
  <div class="section-head">
    <h2 class="section-title">Best sellers</h2>
    <a href="<?= e(url('products.php')) ?>">View all &rarr;</a>
  </div>
  <?php if ($featured): ?>
    <div class="product-grid">
      <?php foreach ($featured as $p) { product_card($p); } ?>
    </div>
  <?php else: ?>
    <p class="muted">No featured products yet.</p>
  <?php endif; ?>
</section>

<!-- MEDICINE -->
<section class="medicine-band">
  <div class="section-head">
    <h2 class="section-title">Medicine &amp; Healthcare</h2>
    <a href="<?= e(url('products.php?kind=medicine')) ?>">View all &rarr;</a>
  </div>
  <p class="muted">Trusted medicines and health products, delivered fast. Prescription (Rx) medicines are delivered only after our pharmacist confirms your prescription by phone.</p>
  <div class="product-grid">
    <?php foreach ($medicine as $p) { product_card($p); } ?>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
