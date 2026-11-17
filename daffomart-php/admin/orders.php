<?php
/*
 * admin/orders.php  -  all orders, filter by status (orders.php?status=pending)
 */
$adminPage = 'orders';
$pageTitle = 'Orders';
require __DIR__ . '/_top.php';

$statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
$status = $_GET['status'] ?? '';
if (!in_array($status, $statuses, true)) { $status = ''; }

$sql = 'SELECT * FROM orders';
$params = [];
if ($status !== '') {
    $sql .= ' WHERE status = ?';
    $params[] = $status;
}
$sql .= ' ORDER BY created_at DESC';
$st = db()->prepare($sql);
$st->execute($params);
$orders = $st->fetchAll();
?>

<div class="admin-top">
  <h1>Orders</h1>
  <a class="btn btn-outline" href="<?= e(url('admin/export-orders.php' . ($status !== '' ? '?status=' . $status : ''))) ?>">⬇ Export CSV</a>
</div>

<div class="filter-bar">
  <a class="<?= $status === '' ? 'active' : '' ?>" href="<?= e(url('admin/orders.php')) ?>">All</a>
  <?php foreach ($statuses as $s): ?>
    <a class="<?= $status === $s ? 'active' : '' ?>" href="<?= e(url('admin/orders.php?status=' . $s)) ?>"><?= e(order_status_label($s)) ?></a>
  <?php endforeach; ?>
</div>

<div class="card table-wrap">
  <table class="table">
    <thead><tr><th>Order no</th><th>Date</th><th>Customer</th><th>Phone</th><th>Total</th><th>Status</th><th></th></tr></thead>
    <tbody>
      <?php foreach ($orders as $o): ?>
        <tr>
          <td><strong><?= e($o['order_no']) ?></strong></td>
          <td><?= e(date('d M Y, h:i A', strtotime($o['created_at']))) ?></td>
          <td><?= e($o['customer_name']) ?></td>
          <td><?= e($o['phone']) ?></td>
          <td><?= money($o['total']) ?></td>
          <td><span class="status status-<?= e($o['status']) ?>"><?= e(order_status_label($o['status'])) ?></span></td>
          <td><a class="btn btn-outline btn-sm" href="<?= e(url('admin/order-view.php?id=' . (int)$o['id'])) ?>">View</a></td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$orders): ?><tr><td colspan="7" class="muted">No orders found.</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>

<?php require __DIR__ . '/_bottom.php'; ?>
