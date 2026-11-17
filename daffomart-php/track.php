<?php
/*
 * track.php  -  ORDER TRACKING
 * Customer enters order number + phone number. Both must match.
 */
require_once __DIR__ . '/includes/functions.php';

$orderNo = input_str($_POST, 'order_no') ?: input_str($_GET, 'order_no');
$phone   = input_str($_POST, 'phone');
$order   = null;
$items   = [];
$error   = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $st = db()->prepare('SELECT * FROM orders WHERE order_no = ? AND phone = ?');
    $st->execute([$orderNo, $phone]);
    $order = $st->fetch();
    if ($order) {
        $st = db()->prepare('SELECT * FROM order_items WHERE order_id = ?');
        $st->execute([$order['id']]);
        $items = $st->fetchAll();
    } else {
        $error = 'No order found. Check the order number and phone number.';
    }
}

$steps = ['pending', 'confirmed', 'shipped', 'delivered'];

$pageTitle = 'Track order';
require __DIR__ . '/includes/header.php';
?>

<h1>Track your order</h1>

<form method="post" class="card form-card narrow" novalidate>
  <?= csrf_field() ?>
  <label>Order number
    <input type="text" name="order_no" value="<?= e($orderNo) ?>" placeholder="DM250117-4821" required>
  </label>
  <label>Phone number used in the order
    <input type="tel" name="phone" value="<?= e($phone) ?>" placeholder="01712345678" required>
  </label>
  <button class="btn btn-primary">Track</button>
</form>

<?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>

<?php if ($order): ?>
  <div class="card result-box">
    <h2>Order <?= e($order['order_no']) ?></h2>
    <p class="muted">Placed on <?= e(date('d M Y, h:i A', strtotime($order['created_at']))) ?></p>

    <?php if ($order['status'] === 'cancelled'): ?>
      <div class="alert alert-error">This order was cancelled.</div>
    <?php else: ?>
      <!-- progress steps: the steps up to the current status get the "done" class -->
      <ol class="steps">
        <?php $reached = array_search($order['status'], $steps, true); ?>
        <?php foreach ($steps as $i => $s): ?>
          <li class="<?= $i <= $reached ? 'done' : '' ?>"><?= e(order_status_label($s)) ?></li>
        <?php endforeach; ?>
      </ol>
    <?php endif; ?>

    <table class="table">
      <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
      <tbody>
        <?php foreach ($items as $i): ?>
          <tr><td><?= e($i['product_name']) ?></td><td><?= (int)$i['qty'] ?></td><td><?= money($i['line_total']) ?></td></tr>
        <?php endforeach; ?>
        <?php if ((float)$order['discount'] > 0): ?>
          <tr><td colspan="2">Coupon <?= e($order['coupon_code']) ?></td><td>- <?= money($order['discount']) ?></td></tr>
        <?php endif; ?>
        <tr><td colspan="2">Delivery</td><td><?= money($order['delivery_charge']) ?></td></tr>
        <tr class="total-row"><td colspan="2">Total</td><td><?= money($order['total']) ?></td></tr>
      </tbody>
    </table>
    <p class="muted small">Delivery address: <?= e($order['address']) ?></p>
  </div>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
