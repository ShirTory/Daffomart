<?php
/*
 * cart.php  -  SHOPPING CART
 * POST actions: add, update (quantities + remove button), clear, coupon, remove_coupon.
 * "add" can also be called by JavaScript (AJAX); then PHP answers with JSON instead of redirecting.
 */
require_once __DIR__ . '/includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = input_str($_POST, 'action');

    if ($action === 'add') {
        $msg = cart_add((int)input_str($_POST, 'product_id'), max(1, (int)input_str($_POST, 'qty')));
        if (is_ajax()) {
            json_out([
                'ok'      => $msg === '',
                'message' => $msg === '' ? 'Added to cart.' : $msg,
                'count'   => cart_count(),
            ]);
        }
        flash($msg === '' ? 'success' : 'info', $msg === '' ? 'Added to cart.' : $msg);

        // go back to the page the user was on (only if it is our own site)
        $ref = $_SERVER['HTTP_REFERER'] ?? '';
        if ($ref !== '' && parse_url($ref, PHP_URL_HOST) === ($_SERVER['HTTP_HOST'] ?? '')
            && strpos($ref, 'cart.php') === false) {
            header('Location: ' . $ref);
            exit;
        }
    }

    if ($action === 'update') {
        if (isset($_POST['remove'])) {               // the "Remove" button was pressed
            unset($_SESSION['cart'][(int)$_POST['remove']]);
            flash('success', 'Item removed.');
            redirect('cart.php');
        }
        $quantities = $_POST['qty'] ?? [];
        if (is_array($quantities)) {
            foreach ($quantities as $id => $qty) {
                $id  = (int)$id;
                $qty = (int)$qty;
                if ($qty <= 0) {
                    unset($_SESSION['cart'][$id]);
                } else {
                    $_SESSION['cart'][$id] = min($qty, 99);
                }
            }
        }
        flash('success', 'Cart updated.');
    }

    if ($action === 'clear') {
        $_SESSION['cart'] = [];
        unset($_SESSION['coupon']);
    }

    if ($action === 'coupon') {
        [, $subtotalNow] = cart_lines();
        [$coupon, $err] = coupon_check(input_str($_POST, 'code'), (float)$subtotalNow);
        if ($coupon) {
            $_SESSION['coupon'] = $coupon['code'];
            flash('success', 'Coupon ' . $coupon['code'] . ' applied.');
        } else {
            flash('error', $err);
        }
    }

    if ($action === 'remove_coupon') {
        unset($_SESSION['coupon']);
        flash('success', 'Coupon removed.');
    }

    redirect('cart.php');
}

[$lines, $subtotal] = cart_lines();
$totals = cart_totals((float)$subtotal);

$pageTitle = 'Your cart';
$metaDesc  = 'Review the items in your ' . STORE_NAME . ' cart.';
require __DIR__ . '/includes/header.php';
?>

<h1>Your cart</h1>

<?php if (!$lines): ?>
  <div class="empty card">
    <p class="big">🛒</p>
    <h3>Your cart is empty</h3>
    <a class="btn btn-primary" href="<?= e(url('products.php')) ?>">Start shopping</a>
  </div>
<?php else: ?>
  <div class="cart-layout">

    <form method="post" class="card table-wrap">
      <?= csrf_field() ?>
      <input type="hidden" name="action" value="update">
      <!-- hidden default button: pressing Enter in a quantity box updates the cart (and does NOT press "Remove") -->
      <button type="submit" class="visually-hidden" tabindex="-1" aria-hidden="true">Update</button>
      <table class="table">
        <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($lines as $l): $p = $l['product']; ?>
          <tr>
            <td>
              <a href="<?= e(url('product.php?slug=' . urlencode($p['slug']))) ?>"><?= e($p['name']) ?></a>
              <div class="muted small"><?= e($p['unit']) ?></div>
            </td>
            <td><?= money($p['price']) ?></td>
            <td class="qty-cell"><input class="qty" type="number" data-stepper name="qty[<?= (int)$p['id'] ?>]" value="<?= (int)$l['qty'] ?>" min="0" max="<?= (int)$p['stock'] ?>" aria-label="Quantity of <?= e($p['name']) ?>"></td>
            <td><?= money($l['total']) ?></td>
            <td>
              <!-- name="remove" + value=id: PHP sees which item to delete -->
              <button class="link-danger" type="submit" name="remove" value="<?= (int)$p['id'] ?>">Remove</button>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <div class="table-actions">
        <button class="btn btn-outline" type="submit">Update cart</button>
      </div>
    </form>

    <aside class="card summary">
      <h3>Order summary</h3>

      <!-- Coupon -->
      <?php if ($totals['coupon']): ?>
        <form method="post" class="coupon-applied">
          <?= csrf_field() ?>
          <input type="hidden" name="action" value="remove_coupon">
          <span>🏷️ <strong><?= e($totals['coupon']['code']) ?></strong> applied</span>
          <button class="link-danger">Remove</button>
        </form>
      <?php else: ?>
        <form method="post" class="coupon-form">
          <?= csrf_field() ?>
          <input type="hidden" name="action" value="coupon">
          <input type="text" name="code" placeholder="Coupon code" autocomplete="off" aria-label="Coupon code" maxlength="30">
          <button class="btn btn-outline">Apply</button>
        </form>
      <?php endif; ?>

      <p class="row"><span>Subtotal</span><strong><?= money($totals['subtotal']) ?></strong></p>
      <?php if ($totals['discount'] > 0): ?>
        <p class="row discount"><span>Discount</span><strong>- <?= money($totals['discount']) ?></strong></p>
      <?php endif; ?>
      <p class="muted small">Delivery charge is added at checkout.</p>
      <a class="btn btn-primary btn-block" href="<?= e(url('checkout.php')) ?>">Proceed to checkout</a>
      <form method="post">
        <?= csrf_field() ?>
        <input type="hidden" name="action" value="clear">
        <button class="btn btn-ghost btn-block">Clear cart</button>
      </form>
    </aside>
  </div>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
