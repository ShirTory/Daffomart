<?php
/*
 * admin/index.php  -  DASHBOARD: totals, 7-day sales chart, latest orders, low stock.
 */
$adminPage = 'dashboard';
$pageTitle = 'Dashboard';
require __DIR__ . '/_top.php';

$pdo = db();
$orders   = (int)$pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
$pending  = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'pending'")->fetchColumn();
$revenue  = (float)$pdo->query("SELECT COALESCE(SUM(total),0) FROM orders WHERE status = 'delivered'")->fetchColumn();
$products = (int)$pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
$newApps  = (int)$pdo->query("SELECT COUNT(*) FROM rider_applications WHERE status = 'new'")->fetchColumn();
$lowStock = $pdo->query('SELECT id, name, stock FROM products WHERE active = 1 AND stock <= 5 ORDER BY stock ASC LIMIT 8')->fetchAll();
$latest   = $pdo->query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8')->fetchAll();

// ---- last 7 days (orders that are not cancelled) ----
$rows = $pdo->query(
    "SELECT DATE(created_at) AS d, COUNT(*) AS c, COALESCE(SUM(total),0) AS s
     FROM orders WHERE status <> 'cancelled' AND created_at >= (CURDATE() - INTERVAL 6 DAY)
     GROUP BY DATE(created_at)"
)->fetchAll();
$byDay = [];
foreach ($rows as $r) { $byDay[$r['d']] = $r; }
$days = [];
$maxSales = 0.0;
for ($i = 6; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-$i day"));
    $sales = isset($byDay[$d]) ? (float)$byDay[$d]['s'] : 0.0;
    $days[] = ['label' => date('D', strtotime($d)), 'sales' => $sales, 'count' => isset($byDay[$d]) ? (int)$byDay[$d]['c'] : 0];
    $maxSales = max($maxSales, $sales);
}
?>

<div class="admin-top">
  <h1>Dashboard</h1>
  <a class="btn btn-outline" href="<?= e(url('admin/export-orders.php')) ?>">⬇ Export all orders (CSV)</a>
</div>

<div class="stats">
  <div class="card stat"><strong><?= $orders ?></strong><span>Total orders</span></div>
  <div class="card stat"><strong><?= $pending ?></strong><span>Pending orders</span></div>
  <div class="card stat"><strong><?= money($revenue) ?></strong><span>Delivered sales</span></div>
  <div class="card stat"><strong><?= $products ?></strong><span>Products</span></div>
  <div class="card stat"><strong><?= $newApps ?></strong><span>New rider applications</span></div>
</div>

<section class="card chart-card">
  <h3>Sales - last 7 days</h3>
  <div class="bars" role="img" aria-label="Bar chart of sales for the last 7 days">
    <?php foreach ($days as $d): ?>
      <div class="bar-col" title="<?= e($d['label'] . ': ' . money($d['sales']) . ' (' . $d['count'] . ' orders)') ?>">
        <span class="bar-value"><?= $d['sales'] > 0 ? e(money($d['sales'])) : '' ?></span>
        <span class="bar" style="height: <?= $maxSales > 0 ? max(2, round($d['sales'] / $maxSales * 100)) : 2 ?>%"></span>
        <span class="bar-label"><?= e($d['label']) ?></span>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<div class="two-col">
  <section class="card">
    <h3 style="padding:1rem 1rem 0">Latest orders</h3>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          <?php foreach ($latest as $o): ?>
            <tr>
              <td><a href="<?= e(url('admin/order-view.php?id=' . (int)$o['id'])) ?>"><?= e($o['order_no']) ?></a></td>
              <td><?= e($o['customer_name']) ?></td>
              <td><?= money($o['total']) ?></td>
              <td><span class="status status-<?= e($o['status']) ?>"><?= e(order_status_label($o['status'])) ?></span></td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$latest): ?><tr><td colspan="4" class="muted">No orders yet.</td></tr><?php endif; ?>
        </tbody>
      </table>
    </div>
  </section>

  <section class="card">
    <h3 style="padding:1rem 1rem 0">Low stock (5 or less)</h3>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Product</th><th>Stock</th></tr></thead>
        <tbody>
          <?php foreach ($lowStock as $p): ?>
            <tr>
              <td><a href="<?= e(url('admin/product-form.php?id=' . (int)$p['id'])) ?>"><?= e($p['name']) ?></a></td>
              <td><?= (int)$p['stock'] ?></td>
            </tr>
          <?php endforeach; ?>
          <?php if (!$lowStock): ?><tr><td colspan="2" class="muted">All products have enough stock.</td></tr><?php endif; ?>
        </tbody>
      </table>
    </div>
  </section>
</div>

<?php require __DIR__ . '/_bottom.php'; ?>
