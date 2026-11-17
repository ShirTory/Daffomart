<?php
/*
 * admin/categories.php  -  add, edit and delete categories (all on one page).
 */
require_once __DIR__ . '/_init.php';
$adminPage = 'categories';
$pageTitle = 'Categories';

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = $_POST['action'] ?? '';

    if ($action === 'save') {
        $id    = (int)($_POST['id'] ?? 0);
        $name  = trim($_POST['name'] ?? '');
        $emoji = trim($_POST['emoji'] ?? '');
        $kind  = ($_POST['kind'] ?? '') === 'medicine' ? 'medicine' : 'grocery';
        $order = (int)($_POST['sort_order'] ?? 0);
        $active = isset($_POST['active']) ? 1 : 0;

        if ($name === '') {
            flash('error', 'Category name is required.');
        } elseif ($id > 0) {
            $pdo->prepare('UPDATE categories SET name=?, emoji=?, kind=?, sort_order=?, active=? WHERE id=?')
                ->execute([$name, $emoji, $kind, $order, $active, $id]);
            flash('success', 'Category updated.');
        } else {
            $slug = make_slug($name);
            $chk = $pdo->prepare('SELECT COUNT(*) FROM categories WHERE slug = ?');
            $chk->execute([$slug]);
            if ($chk->fetchColumn() > 0) { $slug .= '-' . random_int(100, 999); }
            $pdo->prepare('INSERT INTO categories (name, slug, emoji, kind, sort_order, active) VALUES (?,?,?,?,?,?)')
                ->execute([$name, $slug, $emoji, $kind, $order, $active]);
            flash('success', 'Category added.');
        }
    }

    if ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        $st = $pdo->prepare('SELECT COUNT(*) FROM products WHERE category_id = ?');
        $st->execute([$id]);
        if ($st->fetchColumn() > 0) {
            flash('error', 'This category has products. Move or delete the products first.');
        } else {
            $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
            flash('success', 'Category deleted.');
        }
    }
    redirect('admin/categories.php');
}

$editId = (int)($_GET['edit'] ?? 0);
$edit = ['id' => 0, 'name' => '', 'emoji' => '', 'kind' => 'grocery', 'sort_order' => 0, 'active' => 1];
if ($editId > 0) {
    $st = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
    $st->execute([$editId]);
    $edit = $st->fetch() ?: $edit;
}

$cats = $pdo->query(
    'SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
     FROM categories c ORDER BY c.sort_order, c.name'
)->fetchAll();

require __DIR__ . '/_top.php';
?>

<div class="admin-top"><h1>Categories</h1></div>

<div class="two-col">
  <section class="card table-wrap">
    <table class="table">
      <thead><tr><th>Category</th><th>Type</th><th>Order</th><th>Products</th><th></th></tr></thead>
      <tbody>
        <?php foreach ($cats as $c): ?>
          <tr>
            <td><?= e($c['emoji'] . ' ' . $c['name']) ?> <?= $c['active'] ? '' : '<span class="badge badge-out">Hidden</span>' ?></td>
            <td><?= e(ucfirst($c['kind'])) ?></td>
            <td><?= (int)$c['sort_order'] ?></td>
            <td><?= (int)$c['product_count'] ?></td>
            <td>
              <div class="actions">
                <a class="btn btn-outline btn-sm" href="<?= e(url('admin/categories.php?edit=' . (int)$c['id'])) ?>">Edit</a>
                <form method="post" data-confirm="Delete category <?= e($c['name']) ?>?">
                  <?= csrf_field() ?>
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
                  <button class="btn btn-danger btn-sm">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </section>

  <section class="card form-card">
    <h3><?= $edit['id'] ? 'Edit category' : 'Add category' ?></h3>
    <form method="post">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="save">
      <input type="hidden" name="id" value="<?= (int)$edit['id'] ?>">
      <label>Name * <input type="text" name="name" value="<?= e($edit['name']) ?>" required></label>
      <label>Emoji <input type="text" name="emoji" maxlength="8" value="<?= e($edit['emoji']) ?>" placeholder="🥦"></label>
      <label>Type
        <select name="kind">
          <option value="grocery"  <?= $edit['kind'] === 'grocery'  ? 'selected' : '' ?>>Grocery</option>
          <option value="medicine" <?= $edit['kind'] === 'medicine' ? 'selected' : '' ?>>Medicine</option>
        </select>
      </label>
      <label>Sort order (small number shows first)
        <input type="number" name="sort_order" value="<?= (int)$edit['sort_order'] ?>">
      </label>
      <label class="check"><input type="checkbox" name="active" <?= $edit['active'] ? 'checked' : '' ?>> Visible on website</label>
      <div class="actions">
        <button class="btn btn-primary">Save</button>
        <?php if ($edit['id']): ?><a class="btn btn-outline" href="<?= e(url('admin/categories.php')) ?>">Cancel</a><?php endif; ?>
      </div>
    </form>
  </section>
</div>

<?php require __DIR__ . '/_bottom.php'; ?>
