<?php
/*
 * admin/order-view.php  -  one order: details, change status, print invoice.
 * Cancelling an order puts the products back into stock (and gives the coupon use back).
 */
require_once __DIR__ . '/_init.php';
$adminPage = 'orders';
$pageTitle = 'Order details';

$pdo = db();
$id = (int)($_GET['id'] ?? 0);
$st = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
$st->execute([$id]);
$order = $st->fetch();
if (!$order) {
    flash('error', 'Order not found.');
    redirect('admin/orders.php');
}

$statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $new = input_str($_POST, 'status');
    if (!in_array($new, $statuses, true)) {
        flash('error', 'Invalid status.');
    } elseif ($order['status'] === 'cancelled') {
        flash('error', 'A cancelled order cannot be changed.');
    } elseif ($new !== $order['status']) {
        try {
            $pdo->beginTransaction();
            if ($new === 'cancelled') {
                // give the stock back
                $pdo->prepare(
                    'UPDATE products p JOIN order_items i ON i.product_id = p.id
                     SET p.stock = p.stock + i.qty WHERE i.order_id = ?'
                )->execute([$order['id']]);
                // give the coupon use back
                if (!empty($order['coupon_code'])) {
                    $pdo->prepare('UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = ?')
                        ->execute([$order['coupon_code']]);
                }
            }
            $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$new, $order['id']]);
            $pdo->commit();
            flash('success', 'Order status changed to ' . order_status_label($new) . '.');
        } catch (Throwable $ex) {
            if ($pdo->inTransaction()) { $pdo->rollBack(); }
            flash('error', 'Could not update the order.');
        }
    }
    redirect('admin/order-view.php?id=' . $order['id']);
}

$st = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ?');
$st->execute([$order['id']]);
$items = $st->fetchAll();

require __DIR__ . '/_top.php';
?>

<div class="admin-top">
  <h1>Order <?= e($order['order_no']) ?></h1>
  <div class="actions">
    <a class="btn btn-outline" target="_blank" rel="noopener" href="<?= e(url('admin/invoice.php?id=' . (int)$order['id'])) ?>">🖨 Print invoice</a>
    <a class="btn btn-outline" href="<?= e(url('admin/orders.php')) ?>">&larr; All orders</a>
  </div>
</div>

<div class="two-col">
  <section class="card info-card">
    <h3>Customer</h3>
    <p><strong><?= e($order['customer_name']) ?></strong></p>
    <p>📞 <?= e($order['phone']) ?></p>
    <p>📍 <?= nl2br(e($order['address'])) ?></p>
    <p class="muted small"><?= $order['area'] === 'outside' ? 'Outside Dhaka' : 'Inside Dhaka' ?> &middot; Placed <?= e(date('d M Y, h:i A', strtotime($order['created_at']))) ?></p>
    <?php if ($order['note']): ?><p><strong>Note:</strong> <?= nl2br(e($order['note'])) ?></p><?php endif; ?>

    <h3>Status</h3>
    <p><span class="status status-<?= e($order['status']) ?>"><?= e(order_status_label($order['status'])) ?></span></p>
    <?php if ($order['status'] !== 'cancelled'): ?>
      <form method="post" class="actions" data-confirm-select="cancelled|Cancel this order? Stock will be returned.">
        <?= csrf_field() ?>
        <select name="status">
          <?php foreach ($statuses as $s): ?>
            <option value="<?= e($s) ?>" <?= $order['status'] === $s ? 'selected' : '' ?>><?= e(order_status_label($s)) ?></option>
          <?php endforeach; ?>
        </select>
        <button class="btn btn-primary">Update</button>
      </form>
    <?php endif; ?>
  </section>

  <section class="card info-card">
    <h3>Items</h3>
    <table class="table">
      <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
      <tbody>
        <?php foreach ($items as $i): ?>
          <tr><td><?= e($i['product_name']) ?></td><td><?= money($i['unit_price']) ?></td><td><?= (int)$i['qty'] ?></td><td><?= money($i['line_total']) ?></td></tr>
        <?php endforeach; ?>
        <tr><td colspan="3">Subtotal</td><td><?= money($order['subtotal']) ?></td></tr>
        <?php if ((float)$order['discount'] > 0): ?>
          <tr><td colspan="3">Coupon <?= e($order['coupon_code']) ?></td><td>- <?= money($order['discount']) ?></td></tr>
        <?php endif; ?>
        <tr><td colspan="3">Delivery</td><td><?= money($order['delivery_charge']) ?></td></tr>
        <tr class="total-row"><td colspan="3">Total (cash on delivery)</td><td><?= money($order['total']) ?></td></tr>
      </tbody>
    </table>
  </section>
</div>

<?php require __DIR__ . '/_bottom.php'; ?>
