<?php
/*
 * account.php  -  "MY ORDERS" page for a logged-in customer.
 */
require_once __DIR__ . '/includes/functions.php';

$user = require_login();

$st = db()->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
$st->execute([$user['id']]);
$orders = $st->fetchAll();

$pageTitle = 'My orders';
require __DIR__ . '/includes/header.php';
?>

<h1>My orders</h1>
<p class="muted">Logged in as <?= e($user['name']) ?> (<?= e($user['email']) ?>)</p>

<?php if (!$orders): ?>
  <div class="empty card">
    <p class="big">📦</p>
    <h3>No orders yet</h3>
    <a class="btn btn-primary" href="<?= e(url('products.php')) ?>">Start shopping</a>
  </div>
<?php else: ?>
  <div class="card table-wrap">
    <table class="table">
      <thead><tr><th>Order no</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>
        <?php foreach ($orders as $o): ?>
          <tr>
            <td><?= e($o['order_no']) ?></td>
            <td><?= e(date('d M Y', strtotime($o['created_at']))) ?></td>
            <td><?= money($o['total']) ?></td>
            <td><span class="status status-<?= e($o['status']) ?>"><?= e(order_status_label($o['status'])) ?></span></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
