<?php
/*
 * policy.php  -  delivery, return and privacy policy (static page).
 */
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Policies';
$metaDesc  = 'Delivery, return and privacy policy of ' . STORE_NAME . '.';
require __DIR__ . '/includes/header.php';
?>

<h1>Policies</h1>

<div class="card info-card policy">
  <h2>Delivery</h2>
  <p>We deliver inside Dhaka for <?= money(DELIVERY_INSIDE) ?> (usually the same day) and outside Dhaka for <?= money(DELIVERY_OUTSIDE) ?> (1-3 days by courier). Payment is cash on delivery.</p>

  <h2>Returns &amp; exchange</h2>
  <p>Unopened items can be returned within 24 hours of delivery with proof of purchase. Perishable goods may not be eligible. Damaged or wrong items can be exchanged within 24 hours. Please keep the original packaging.</p>

  <h2>Medicine</h2>
  <p>Prescription (Rx) medicines are delivered only after our pharmacist confirms the prescription by phone. Always read the label and follow your doctor's advice. For emergencies, contact a doctor or hospital.</p>

  <h2>Privacy</h2>
  <p>We only collect the information needed to deliver your order (name, phone, address). We never sell your data. Passwords are stored in encrypted (hashed) form.</p>

  <h2>Contact</h2>
  <p>Questions? Call <?= e(STORE_PHONE) ?> or email <?= e(STORE_EMAIL) ?>.</p>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
