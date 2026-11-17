<?php
/*
 * admin/coupons.php  -  create, edit and delete coupon (promo) codes.
 * Customers apply them in the cart; checkout checks them again.
 */
require_once __DIR__ . '/_init.php';
$adminPage = 'coupons';
$pageTitle = 'Coupons';

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = input_str($_POST, 'action');

    if ($action === 'save') {
        $id      = (int)input_str($_POST, 'id');
        $code    = strtoupper(input_str($_POST, 'code'));
        $type    = input_str($_POST, 'type') === 'fixed' ? 'fixed' : 'percent';
        $value   = input_str($_POST, 'value');
        $minOrd  = input_str($_POST, 'min_order');
        $maxUses = input_str($_POST, 'max_uses');
        $expires = input_str($_POST, 'expires_on');
        $active  = isset($_POST['active']) ? 1 : 0;

        $errors = [];
        if (!preg_match('/^[A-Z0-9]{3,30}$/', $code))             { $errors[] = 'Code must be 3-30 letters or numbers (no spaces).'; }
        if (!is_numeric($value) || (float)$value <= 0)            { $errors[] = 'Discount value must be more than 0.'; }
        if ($type === 'percent' && is_numeric($value) && (float)$value > 100) { $errors[] = 'Percent cannot be more than 100.'; }
        if ($minOrd !== '' && (!is_numeric($minOrd) || (float)$minOrd < 0))     { $errors[] = 'Minimum order must be a number.'; }
        if ($maxUses !== '' && !ctype_digit($maxUses))            { $errors[] = 'Max uses must be a whole number (or empty).'; }
        if ($expires !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expires)) { $errors[] = 'Expiry date is not valid.'; }

        if ($errors) {
            flash('error', implode(' ', $errors));
        } else {
            $params = [$code, $type, $value, $minOrd === '' ? 0 : $minOrd, $maxUses === '' ? null : (int)$maxUses,
                       $expires === '' ? null : $expires, $active];
            try {
                if ($id > 0) {
                    $pdo->prepare('UPDATE coupons SET code=?, type=?, value=?, min_order=?, max_uses=?, expires_on=?, active=? WHERE id=?')
                        ->execute(array_merge($params, [$id]));
                    flash('success', 'Coupon updated.');
                } else {
                    $pdo->prepare('INSERT INTO coupons (code, type, value, min_order, max_uses, expires_on, active) VALUES (?,?,?,?,?,?,?)')
                        ->execute($params);
                    flash('success', 'Coupon created.');
                }
            } catch (PDOException $ex) {
                // 1062 = duplicate code
                flash('error', ($ex->errorInfo[1] ?? 0) == 1062 ? 'This code already exists.' : 'Could not save the coupon.');
            }
        }
    }

    if ($action === 'delete') {
        $pdo->prepare('DELETE FROM coupons WHERE id = ?')->execute([(int)input_str($_POST, 'id')]);
        flash('success', 'Coupon deleted.');
    }
    redirect('admin/coupons.php');
}

$editId = (int)input_str($_GET, 'edit');
$edit = ['id' => 0, 'code' => '', 'type' => 'percent', 'value' => '', 'min_order' => 0, 'max_uses' => '', 'expires_on' => '', 'active' => 1];
if ($editId > 0) {
    $st = $pdo->prepare('SELECT * FROM coupons WHERE id = ?');
    $st->execute([$editId]);
    $edit = $st->fetch() ?: $edit;
}
$coupons = $pdo->query('SELECT * FROM coupons ORDER BY id DESC')->fetchAll();

require __DIR__ . '/_top.php';
?>

<div class="admin-top"><h1>Coupons</h1></div>

<div class="two-col">
  <section class="card table-wrap">
    <table class="table">
      <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Expires</th><th></th></tr></thead>
      <tbody>
        <?php foreach ($coupons as $c): ?>
          <?php $expired = $c['expires_on'] !== null && $c['expires_on'] < date('Y-m-d'); ?>
          <tr>
            <td><strong><?= e($c['code']) ?></strong> <?= $c['active'] && !$expired ? '' : '<span class="badge badge-out">Off</span>' ?></td>
            <td><?= $c['type'] === 'percent' ? e(rtrim(rtrim($c['value'], '0'), '.')) . '%' : money($c['value']) ?></td>
            <td><?= money($c['min_order']) ?></td>
            <td><?= (int)$c['used_count'] ?><?= $c['max_uses'] !== null ? ' / ' . (int)$c['max_uses'] : '' ?></td>
            <td><?= $c['expires_on'] ? e($c['expires_on']) : '-' ?></td>
            <td>
              <div class="actions">
                <a class="btn btn-outline btn-sm" href="<?= e(url('admin/coupons.php?edit=' . (int)$c['id'])) ?>">Edit</a>
                <form method="post" data-confirm="Delete coupon <?= e($c['code']) ?>?">
                  <?= csrf_field() ?>
                  <input type="hidden" name="action" value="delete">
                  <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
                  <button class="btn btn-danger btn-sm">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if (!$coupons): ?><tr><td colspan="6" class="muted">No coupons yet.</td></tr><?php endif; ?>
      </tbody>
    </table>
  </section>

  <section class="card form-card">
    <h3><?= $edit['id'] ? 'Edit coupon' : 'New coupon' ?></h3>
    <form method="post">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="save">
      <input type="hidden" name="id" value="<?= (int)$edit['id'] ?>">
      <label>Code * (letters and numbers)
        <input type="text" name="code" value="<?= e($edit['code']) ?>" maxlength="30" style="text-transform:uppercase" required>
      </label>
      <label>Type
        <select name="type">
          <option value="percent" <?= $edit['type'] === 'percent' ? 'selected' : '' ?>>Percent (%)</option>
          <option value="fixed"   <?= $edit['type'] === 'fixed'   ? 'selected' : '' ?>>Fixed amount (Taka)</option>
        </select>
      </label>
      <label>Value *
        <input type="number" name="value" step="0.01" min="0.01" value="<?= e($edit['value']) ?>" required>
      </label>
      <label>Minimum order (Taka)
        <input type="number" name="min_order" step="0.01" min="0" value="<?= e($edit['min_order']) ?>">
      </label>
      <label>Max uses (empty = unlimited)
        <input type="number" name="max_uses" min="1" step="1" value="<?= e($edit['max_uses']) ?>">
      </label>
      <label>Expires on (empty = never)
        <input type="date" name="expires_on" value="<?= e($edit['expires_on']) ?>">
      </label>
      <label class="check"><input type="checkbox" name="active" <?= $edit['active'] ? 'checked' : '' ?>> Active</label>
      <div class="actions">
        <button class="btn btn-primary">Save</button>
        <?php if ($edit['id']): ?><a class="btn btn-outline" href="<?= e(url('admin/coupons.php')) ?>">Cancel</a><?php endif; ?>
      </div>
    </form>
  </section>
</div>

<?php require __DIR__ . '/_bottom.php'; ?>
