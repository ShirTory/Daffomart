<?php
/*
 * order-success.php  -  shown after an order is placed.
 * Only the browser that just placed the order can see it (order number is kept in the session).
 */
require_once __DIR__ . '/includes/functions.php';

$orderNo = $_SESSION['last_order_no'] ?? '';
if ($orderNo === '') {
    redirect('index.php');
}

$st = db()->prepare('SELECT * FROM orders WHERE order_no = ?');
$st->execute([$orderNo]);
$order = $st->fetch();
if (!$order) {
    redirect('index.php');
}

$st = db()->prepare('SELECT * FROM order_items WHERE order_id = ?');
$st->execute([$order['id']]);
$items = $st->fetchAll();

$pageTitle = 'Order placed';
require __DIR__ . '/includes/header.php';
?>

<div class="card success-box">
  <p class="big">✅</p>
  <h1>Thank you, <?= e($order['customer_name']) ?>!</h1>
  <p>Your order has been placed. Your order number is</p>
  <p class="order-no"><?= e($order['order_no']) ?></p>
  <p class="muted">Save this number. You can track the order with it and your phone number.</p>

  <table class="table">
    <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
    <tbody>
      <?php foreach ($items as $i): ?>
        <tr><td><?= e($i['product_name']) ?></td><td><?= (int)$i['qty'] ?></td><td><?= money($i['line_total']) ?></td></tr>
      <?php endforeach; ?>
      <tr><td colspan="2">Subtotal</td><td><?= money($order['subtotal']) ?></td></tr>
      <?php if ((float)$order['discount'] > 0): ?>
        <tr><td colspan="2">Coupon <?= e($order['coupon_code']) ?></td><td>- <?= money($order['discount']) ?></td></tr>
      <?php endif; ?>
      <tr><td colspan="2">Delivery</td><td><?= money($order['delivery_charge']) ?></td></tr>
      <tr class="total-row"><td colspan="2">Total (cash on delivery)</td><td><?= money($order['total']) ?></td></tr>
    </tbody>
  </table>

  <a class="btn btn-primary" href="<?= e(url('track.php?order_no=' . urlencode($order['order_no']))) ?>">Track this order</a>
  <a class="btn btn-outline" href="<?= e(url('products.php')) ?>">Continue shopping</a>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
