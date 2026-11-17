<?php
/*
 * admin/invoice.php?id=5  -  printable invoice (press Ctrl+P or the Print button).
 */
require_once __DIR__ . '/_init.php';

$st = db()->prepare('SELECT * FROM orders WHERE id = ?');
$st->execute([(int)($_GET['id'] ?? 0)]);
$order = $st->fetch();
if (!$order) {
    flash('error', 'Order not found.');
    redirect('admin/orders.php');
}
$st = db()->prepare('SELECT * FROM order_items WHERE order_id = ?');
$st->execute([$order['id']]);
$items = $st->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Invoice <?= e($order['order_no']) ?></title>
  <link rel="stylesheet" href="<?= e(url('assets/css/style.css')) ?>">
</head>
<body class="invoice-body">
  <div class="invoice">
    <div class="invoice-head">
      <img src="<?= e(url('assets/img/logo.png')) ?>" alt="<?= e(STORE_NAME) ?>" style="height:48px">
      <div class="right">
        <h1>INVOICE</h1>
        <p><strong><?= e($order['order_no']) ?></strong></p>
        <p><?= e(date('d M Y', strtotime($order['created_at']))) ?></p>
      </div>
    </div>

    <div class="two-col">
      <div>
        <h4>From</h4>
        <p><strong><?= e(STORE_NAME) ?></strong><br><?= e(STORE_ADDRESS) ?><br><?= e(STORE_PHONE) ?><br><?= e(STORE_EMAIL) ?></p>
      </div>
      <div>
        <h4>Bill to</h4>
        <p><strong><?= e($order['customer_name']) ?></strong><br><?= e($order['phone']) ?><br><?= nl2br(e($order['address'])) ?></p>
      </div>
    </div>

    <table class="table">
      <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
      <tbody>
        <?php foreach ($items as $i): ?>
          <tr><td><?= e($i['product_name']) ?></td><td><?= money($i['unit_price']) ?></td><td><?= (int)$i['qty'] ?></td><td><?= money($i['line_total']) ?></td></tr>
        <?php endforeach; ?>
        <tr><td colspan="3">Subtotal</td><td><?= money($order['subtotal']) ?></td></tr>
        <?php if ((float)$order['discount'] > 0): ?>
          <tr><td colspan="3">Coupon <?= e($order['coupon_code']) ?></td><td>- <?= money($order['discount']) ?></td></tr>
        <?php endif; ?>
        <tr><td colspan="3">Delivery</td><td><?= money($order['delivery_charge']) ?></td></tr>
        <tr class="total-row"><td colspan="3">Total to pay</td><td><?= money($order['total']) ?></td></tr>
      </tbody>
    </table>

    <p class="muted small">Payment: cash on delivery &middot; Status: <?= e(order_status_label($order['status'])) ?></p>
    <p class="muted small">Thank you for shopping with <?= e(STORE_NAME) ?>!</p>
    <p class="no-print"><button class="btn btn-primary" onclick="window.print()">Print</button></p>
  </div>
</body>
</html>
