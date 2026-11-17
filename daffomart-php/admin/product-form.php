<?php
/*
 * admin/product-form.php  -  ADD a new product, or EDIT one (product-form.php?id=5)
 */
require_once __DIR__ . '/_init.php';
$adminPage = 'products';

$pdo = db();
$id = (int)($_GET['id'] ?? 0);
$product = null;
if ($id > 0) {
    $st = $pdo->prepare('SELECT * FROM products WHERE id = ?');
    $st->execute([$id]);
    $product = $st->fetch();
    if (!$product) {
        flash('error', 'Product not found.');
        redirect('admin/products.php');
    }
}
$pageTitle = $product ? 'Edit product' : 'Add product';
$categories = $pdo->query('SELECT * FROM categories ORDER BY sort_order, name')->fetchAll();

// form values (when editing: values from the database; on error: what the admin typed)
$f = $product ?? ['name' => '', 'category_id' => '', 'description' => '', 'generic_name' => '', 'price' => '', 'old_price' => '',
                  'unit' => '', 'emoji' => '', 'image' => null, 'stock' => 0, 'featured' => 0, 'is_rx' => 0, 'active' => 1];
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $f['name']         = trim($_POST['name'] ?? '');
    $f['category_id']  = (int)($_POST['category_id'] ?? 0);
    $f['description']  = trim($_POST['description'] ?? '');
    $f['generic_name'] = trim($_POST['generic_name'] ?? '');
    $f['price']        = $_POST['price'] ?? '';
    $f['old_price']    = $_POST['old_price'] ?? '';
    $f['unit']         = trim($_POST['unit'] ?? '');
    $f['emoji']        = trim($_POST['emoji'] ?? '');
    $f['stock']        = $_POST['stock'] ?? '';
    $f['featured']     = isset($_POST['featured']) ? 1 : 0;
    $f['is_rx']        = isset($_POST['is_rx']) ? 1 : 0;
    $f['active']       = isset($_POST['active']) ? 1 : 0;

    if ($f['name'] === '')                              { $errors[] = 'Product name is required.'; }
    if ($f['category_id'] <= 0)                         { $errors[] = 'Choose a category.'; }
    if (!is_numeric($f['price']) || $f['price'] < 0)    { $errors[] = 'Enter a valid price.'; }
    if ($f['old_price'] !== '' && (!is_numeric($f['old_price']) || $f['old_price'] < 0)) { $errors[] = 'Old price must be a number.'; }
    if (!ctype_digit((string)$f['stock']))              { $errors[] = 'Stock must be 0 or more.'; }

    // image upload (optional) - only after the other checks passed, so no unused files are left behind
    $newImage = null;
    if (!$errors) {
        [$newImage, $imgError] = save_product_image($_FILES['image'] ?? ['error' => UPLOAD_ERR_NO_FILE]);
        if ($imgError !== '') { $errors[] = $imgError; }
    }

    if (!$errors) {
        $oldPrice = $f['old_price'] === '' ? null : $f['old_price'];
        if ($product) {
            $image = $newImage ?? $product['image'];
            $pdo->prepare(
                'UPDATE products SET category_id=?, name=?, description=?, generic_name=?, price=?, old_price=?, unit=?, emoji=?,
                 image=?, stock=?, featured=?, is_rx=?, active=? WHERE id=?'
            )->execute([$f['category_id'], $f['name'], $f['description'], $f['generic_name'], $f['price'], $oldPrice, $f['unit'],
                        $f['emoji'], $image, $f['stock'], $f['featured'], $f['is_rx'], $f['active'], $product['id']]);
            // delete the replaced image file
            if ($newImage) {
                delete_product_image($product['image']);
            }
            flash('success', 'Product updated.');
        } else {
            // unique slug: name + random number if already used
            $slug = make_slug($f['name']);
            $chk = $pdo->prepare('SELECT COUNT(*) FROM products WHERE slug = ?');
            $chk->execute([$slug]);
            if ($chk->fetchColumn() > 0) { $slug .= '-' . random_int(100, 999); }
            $pdo->prepare(
                'INSERT INTO products (category_id, name, slug, description, generic_name, price, old_price, unit, emoji, image, stock, featured, is_rx, active)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([$f['category_id'], $f['name'], $slug, $f['description'], $f['generic_name'], $f['price'], $oldPrice,
                        $f['unit'], $f['emoji'], $newImage, $f['stock'], $f['featured'], $f['is_rx'], $f['active']]);
            flash('success', 'Product added.');
        }
        redirect('admin/products.php');
    }
}

require __DIR__ . '/_top.php';             // now the HTML starts
?>

<div class="admin-top"><h1><?= e($pageTitle) ?></h1><a class="btn btn-outline" href="<?= e(url('admin/products.php')) ?>">&larr; Back</a></div>

<?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

<form method="post" enctype="multipart/form-data" class="card form-card">
  <?= csrf_field() ?>
  <div class="form-grid">
    <label>Product name *
      <input type="text" name="name" value="<?= e($f['name']) ?>" required>
    </label>
    <label>Category *
      <select name="category_id" required>
        <option value="">-- choose --</option>
        <?php foreach ($categories as $c): ?>
          <option value="<?= (int)$c['id'] ?>" <?= (int)$f['category_id'] === (int)$c['id'] ? 'selected' : '' ?>><?= e($c['emoji'] . ' ' . $c['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label>Price (Taka) *
      <input type="number" name="price" step="0.01" min="0" value="<?= e($f['price']) ?>" required>
    </label>
    <label>Old price (optional, shows an offer)
      <input type="number" name="old_price" step="0.01" min="0" value="<?= e($f['old_price']) ?>">
    </label>
    <label>Unit (e.g. 1 kg, 10 tablets)
      <input type="text" name="unit" value="<?= e($f['unit']) ?>">
    </label>
    <label>Stock quantity *
      <input type="number" name="stock" min="0" step="1" value="<?= e($f['stock']) ?>" required>
    </label>
    <label>Emoji (used when there is no image)
      <input type="text" name="emoji" maxlength="8" value="<?= e($f['emoji']) ?>" placeholder="🍅">
    </label>
    <label>Generic name (medicine only)
      <input type="text" name="generic_name" value="<?= e($f['generic_name']) ?>">
    </label>
    <label class="full">Description
      <textarea name="description" rows="4"><?= e($f['description']) ?></textarea>
    </label>
    <label class="full">Product image (JPG, PNG or WEBP, max 2 MB)
      <input type="file" name="image" id="imageInput" accept="image/jpeg,image/png,image/webp">
    </label>
    <div class="full">
      <div class="thumb" id="imagePreview" style="width:90px;height:90px"><?= $f['image'] ? product_pic($f) : '' ?></div>
    </div>
    <label class="check"><input type="checkbox" name="featured" <?= $f['featured'] ? 'checked' : '' ?>> Featured on home page</label>
    <label class="check"><input type="checkbox" name="is_rx" <?= $f['is_rx'] ? 'checked' : '' ?>> Prescription (Rx) medicine</label>
    <label class="check"><input type="checkbox" name="active" <?= $f['active'] ? 'checked' : '' ?>> Visible in the shop</label>
  </div>
  <button class="btn btn-primary">Save product</button>
</form>

<?php require __DIR__ . '/_bottom.php'; ?>
