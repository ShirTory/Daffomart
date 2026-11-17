<?php
/*
 * admin/products.php  -  LIST of products + delete.
 */
require_once __DIR__ . '/_init.php';     // login check (must come before any HTML)
$adminPage = 'products';
$pageTitle = 'Products';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    if (($_POST['action'] ?? '') === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        $st = db()->prepare('SELECT image FROM products WHERE id = ?');
        $st->execute([$id]);
        $img = $st->fetchColumn();
        db()->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);   // old orders keep the product name
        delete_product_image($img ?: null);
        flash('success', 'Product deleted.');
    }
    redirect('admin/products.php');
}

$q = input_str($_GET, 'q');
$sql = 'SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id';
$params = [];
if ($q !== '') {
    $sql .= ' WHERE p.name LIKE ?';
    $params[] = '%' . $q . '%';
}
$sql .= ' ORDER BY p.id DESC';
$st = db()->prepare($sql);
$st->execute($params);
$products = $st->fetchAll();

require __DIR__ . '/_top.php';             // now the HTML starts
?>

<div class="admin-top">
  <h1>Products (<?= count($products) ?>)</h1>
  <div class="actions">
    <form method="get" class="actions">
      <input type="search" name="q" value="<?= e($q) ?>" placeholder="Search product...">
      <button class="btn btn-outline">Search</button>
    </form>
    <a class="btn btn-primary" href="<?= e(url('admin/product-form.php')) ?>">+ Add product</a>
  </div>
</div>

<div class="card table-wrap">
  <table class="table">
    <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
    <tbody>
      <?php foreach ($products as $p): ?>
        <tr>
          <td><div class="thumb"><?= product_pic($p) ?></div></td>
          <td>
            <strong><?= e($p['name']) ?></strong>
            <?php if ($p['is_rx']): ?><span class="badge badge-rx">Rx</span><?php endif; ?>
            <?php if ($p['featured']): ?><span class="badge badge-sale">Featured</span><?php endif; ?>
            <div class="muted small"><?= e($p['unit']) ?></div>
          </td>
          <td><?= e($p['category_name']) ?></td>
          <td><?= money($p['price']) ?></td>
          <td><?= (int)$p['stock'] ?></td>
          <td><?= $p['active'] ? '<span class="badge badge-ok">Active</span>' : '<span class="badge badge-out">Hidden</span>' ?></td>
          <td>
            <div class="actions">
              <a class="btn btn-outline btn-sm" href="<?= e(url('admin/product-form.php?id=' . (int)$p['id'])) ?>">Edit</a>
              <form method="post" data-confirm="Delete <?= e($p['name']) ?>? This cannot be undone.">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
                <button class="btn btn-danger btn-sm">Delete</button>
              </form>
            </div>
          </td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$products): ?><tr><td colspan="7" class="muted">No products found.</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>

<?php require __DIR__ . '/_bottom.php'; ?>
