<?php
/*
 * contact.php  -  store information and delivery charges (static page).
 */
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Contact & delivery';
require __DIR__ . '/includes/header.php';
?>

<h1>Contact &amp; delivery</h1>
<p class="muted">We are happy to help with orders, medicine and delivery questions.</p>

<div class="two-col">
  <section class="card info-card">
    <h2><?= e(STORE_NAME) ?></h2>
    <p>📍 <strong>Address:</strong> <?= e(STORE_ADDRESS) ?></p>
    <p>📞 <strong>Phone:</strong> <?= e(STORE_PHONE) ?></p>
    <p>✉️ <strong>Email:</strong> <?= e(STORE_EMAIL) ?></p>
    <p>🕒 <strong>Opening hours:</strong> <?= e(STORE_HOURS) ?></p>
  </section>

  <section class="card info-card">
    <h2>Delivery areas &amp; charges</h2>
    <table class="table">
      <thead><tr><th>Area</th><th>Charge</th><th>Time</th></tr></thead>
      <tbody>
        <tr><td>Inside Dhaka</td><td><?= money(DELIVERY_INSIDE) ?></td><td>Same day</td></tr>
        <tr><td>Outside Dhaka</td><td><?= money(DELIVERY_OUTSIDE) ?></td><td>1-3 days (courier)</td></tr>
      </tbody>
    </table>
    <h3>Return &amp; exchange</h3>
    <p class="small">Unopened items can be returned within 24 hours of delivery with proof of purchase. Perishable goods may not be eligible. Damaged or wrong items can be exchanged within 24 hours. Please keep the original packaging.</p>
    <a class="btn btn-primary" href="<?= e(url('products.php')) ?>">Start shopping</a>
    <a class="btn btn-outline" href="<?= e(url('policy.php')) ?>">All policies</a>
  </section>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
