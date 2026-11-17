<?php
/*
 * checkout.php  -  CHECKOUT (cash on delivery)
 * Steps: validate form -> start transaction -> re-check stock + coupon -> save order + items
 *        -> reduce stock -> commit.   Everything succeeds together, or nothing is saved.
 */
require_once __DIR__ . '/includes/functions.php';

// our own error type, so database errors are never shown to the customer
class OrderProblem extends Exception
{
}

[$lines, $subtotal] = cart_lines();
if (!$lines) {
    flash('info', 'Your cart is empty.');
    redirect('cart.php');
}

$user   = current_user();
$errors = [];
$old = [
    'name'    => $user['name']  ?? '',
    'phone'   => $user['phone'] ?? '',
    'address' => '',
    'area'    => 'inside',
    'note'    => '',
];
$hasRx = false;
foreach ($lines as $l) {
    if ($l['product']['is_rx']) { $hasRx = true; }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();

    $old['name']    = input_str($_POST, 'name');
    $old['phone']   = input_str($_POST, 'phone');
    $old['address'] = input_str($_POST, 'address');
    $old['area']    = input_str($_POST, 'area') === 'outside' ? 'outside' : 'inside';
    $old['note']    = input_str($_POST, 'note');

    // ---- validation ----
    if (text_len($old['name']) < 2)                       { $errors[] = 'Please enter your full name.'; }
    if (!preg_match('/^01[3-9][0-9]{8}$/', $old['phone'])) { $errors[] = 'Enter a valid Bangladeshi mobile number (example: 01712345678).'; }
    if (text_len($old['address']) < 10)                   { $errors[] = 'Please enter your full delivery address.'; }
    if (text_len($old['note']) > 500)                     { $errors[] = 'Order note is too long (max 500 characters).'; }

    if (!$errors) {
        $pdo = db();
        try {
            $pdo->beginTransaction();

            // Lock the product rows so two customers cannot buy the last item together
            $ids   = array_map(fn($l) => (int)$l['product']['id'], $lines);
            $marks = implode(',', array_fill(0, count($ids), '?'));
            $st = $pdo->prepare("SELECT id, name, price, stock FROM products WHERE active = 1 AND id IN ($marks) FOR UPDATE");
            $st->execute($ids);
            $fresh = [];
            foreach ($st->fetchAll() as $row) { $fresh[(int)$row['id']] = $row; }

            $sub = 0.0;
            $items = [];
            foreach ($lines as $l) {
                $id  = (int)$l['product']['id'];
                $qty = (int)$l['qty'];
                if (!isset($fresh[$id]) || (int)$fresh[$id]['stock'] < $qty) {
                    throw new OrderProblem('Sorry, "' . $l['product']['name'] . '" is no longer available in that quantity. Please update your cart.');
                }
                $price = (float)$fresh[$id]['price'];     // price from the database
                $sub  += $price * $qty;
                $items[] = [$id, $fresh[$id]['name'], $price, $qty, $price * $qty];
            }

            // coupon (checked again here, with the row locked)
            $discount = 0.0;
            $couponCode = null;
            $couponId = null;
            $code = $_SESSION['coupon'] ?? '';
            if ($code !== '') {
                $cs = $pdo->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1 FOR UPDATE');
                $cs->execute([$code]);
                $c = $cs->fetch();
                $problem = '';
                if (!$c)                                                                        { $problem = 'it is not valid any more'; }
                elseif ($c['expires_on'] !== null && $c['expires_on'] < date('Y-m-d'))          { $problem = 'it has expired'; }
                elseif ($c['max_uses'] !== null && (int)$c['used_count'] >= (int)$c['max_uses']) { $problem = 'it has been fully used'; }
                elseif ($sub < (float)$c['min_order'])                                          { $problem = 'minimum order is ' . money($c['min_order']); }
                if ($problem !== '') {
                    unset($_SESSION['coupon']);
                    throw new OrderProblem('Your coupon was removed because ' . $problem . '. Please check the total and place the order again.');
                }
                $discount   = coupon_amount($c, $sub);
                $couponCode = $c['code'];
                $couponId   = (int)$c['id'];
            }

            $delivery = delivery_charge($old['area'], $sub);
            $total    = $sub - $discount + $delivery;

            // unique order number like DM250117-4821
            do {
                $orderNo = 'DM' . date('ymd') . '-' . random_int(1000, 9999);
                $chk = $pdo->prepare('SELECT COUNT(*) FROM orders WHERE order_no = ?');
                $chk->execute([$orderNo]);
            } while ($chk->fetchColumn() > 0);

            $pdo->prepare(
                'INSERT INTO orders (order_no, user_id, customer_name, phone, address, area, note, subtotal, coupon_code, discount, delivery_charge, total)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([$orderNo, $user['id'] ?? null, $old['name'], $old['phone'], $old['address'],
                        $old['area'], $old['note'], $sub, $couponCode, $discount, $delivery, $total]);
            $orderId = (int)$pdo->lastInsertId();

            $insItem = $pdo->prepare('INSERT INTO order_items (order_id, product_id, product_name, unit_price, qty, line_total) VALUES (?,?,?,?,?,?)');
            $reduce  = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
            foreach ($items as [$pid, $pname, $price, $qty, $lineTotal]) {
                $insItem->execute([$orderId, $pid, $pname, $price, $qty, $lineTotal]);
                $reduce->execute([$qty, $pid]);
            }
            if ($couponId !== null) {
                $pdo->prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?')->execute([$couponId]);
            }

            $pdo->commit();

            $_SESSION['cart'] = [];
            unset($_SESSION['coupon']);
            $_SESSION['last_order_no'] = $orderNo;
            redirect('order-success.php');
        } catch (OrderProblem $ex) {
            if ($pdo->inTransaction()) { $pdo->rollBack(); }
            $errors[] = $ex->getMessage();
        } catch (Throwable $ex) {
            if ($pdo->inTransaction()) { $pdo->rollBack(); }
            $errors[] = 'Something went wrong while saving your order. Please try again.';
            if (DEBUG) { $errors[] = 'DEBUG: ' . $ex->getMessage(); }
        }
    }
}

// money numbers for the summary box (after the POST code, because a coupon may have been removed)
$totals = cart_totals((float)$subtotal, $old['area']);

$pageTitle = 'Checkout';
$metaDesc  = 'Enter your delivery details and place your cash on delivery order.';
require __DIR__ . '/includes/header.php';
?>

<h1>Checkout</h1>

<?php foreach ($errors as $err): ?>
  <div class="alert alert-error"><?= e($err) ?></div>
<?php endforeach; ?>

<div class="cart-layout">

  <form method="post" class="card form-card" id="checkoutForm" novalidate>
    <?= csrf_field() ?>
    <h3>Delivery details</h3>

    <label>Full name
      <input type="text" name="name" value="<?= e($old['name']) ?>" required autocomplete="name">
    </label>

    <label>Mobile number
      <input type="tel" name="phone" value="<?= e($old['phone']) ?>" placeholder="01712345678" required autocomplete="tel">
    </label>

    <label>Delivery address
      <textarea name="address" rows="3" placeholder="House, road, area, city" required autocomplete="street-address"><?= e($old['address']) ?></textarea>
    </label>

    <fieldset>
      <legend>Delivery area</legend>
      <label class="radio"><input type="radio" name="area" value="inside"  <?= $old['area'] === 'inside'  ? 'checked' : '' ?>> Inside Dhaka (<?= money(DELIVERY_INSIDE) ?>)</label>
      <label class="radio"><input type="radio" name="area" value="outside" <?= $old['area'] === 'outside' ? 'checked' : '' ?>> Outside Dhaka (<?= money(DELIVERY_OUTSIDE) ?>)</label>
    </fieldset>

    <label>Order note (optional)
      <textarea name="note" rows="2" maxlength="500"><?= e($old['note']) ?></textarea>
    </label>

    <p><strong>Payment method:</strong> Cash on delivery</p>

    <?php if ($hasRx): ?>
      <div class="alert alert-info">Your order has a prescription (Rx) medicine. Our pharmacist will call you to confirm the prescription before delivery.</div>
    <?php endif; ?>

    <button class="btn btn-primary btn-block">Place order</button>
  </form>

  <!-- data-* attributes give the numbers to JavaScript (main.js) so the total updates live -->
  <aside class="card summary" id="checkoutSummary"
         data-subtotal="<?= e($totals['subtotal']) ?>" data-discount="<?= e($totals['discount']) ?>"
         data-inside="<?= (int)DELIVERY_INSIDE ?>" data-outside="<?= (int)DELIVERY_OUTSIDE ?>"
         data-free-over="<?= (int)FREE_DELIVERY_OVER ?>">
    <h3>Your order</h3>
    <?php foreach ($lines as $l): ?>
      <p class="row"><span><?= e($l['product']['name']) ?> &times; <?= (int)$l['qty'] ?></span><span><?= money($l['total']) ?></span></p>
    <?php endforeach; ?>
    <hr>
    <p class="row"><span>Subtotal</span><strong><?= money($totals['subtotal']) ?></strong></p>
    <?php if ($totals['discount'] > 0): ?>
      <p class="row discount"><span>Coupon <?= e($totals['coupon']['code']) ?></span><strong>- <?= money($totals['discount']) ?></strong></p>
    <?php endif; ?>
    <p class="row"><span>Delivery</span><strong id="deliveryAmount"><?= $totals['delivery'] > 0 ? money($totals['delivery']) : 'Free' ?></strong></p>
    <p class="row total"><span>Total</span><strong id="grandTotal"><?= money($totals['total']) ?></strong></p>
    <?php if (!$totals['coupon']): ?>
      <p class="small"><a href="<?= e(url('cart.php')) ?>">Have a coupon code? Add it in the cart.</a></p>
    <?php endif; ?>
  </aside>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
