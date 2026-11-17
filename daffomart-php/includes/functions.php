<?php
/*
 * functions.php  -  helper functions used on every page.
 * Sections: 1) basic helpers  2) flash messages  3) CSRF  4) login  5) cart & coupons
 *           6) image upload  7) view helpers (product card, status labels)
 */
require_once __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    // safer session cookie: JavaScript cannot read it, and it is not sent from other sites
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax']);
    session_start();
}

/* ---------- 1) basic helpers ---------- */

// Read a text value from $_GET / $_POST safely (returns '' if missing or not plain text)
function input_str(array $source, string $key): string
{
    return isset($source[$key]) && is_string($source[$key]) ? trim($source[$key]) : '';
}

// Escape text before printing in HTML (stops XSS).
function e($text): string
{
    return htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8');
}

// Build a link inside the site:  url('products.php')
function url(string $path = ''): string
{
    return BASE_URL . '/' . ltrim($path, '/');
}

// https://yourdomain.com  (used for SEO tags and the sitemap)
function site_origin(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
          || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

function redirect(string $path): void
{
    header('Location: ' . url($path));
    exit;
}

// 1250 -> "৳1,250"   12.5 -> "৳12.50"
function money($amount): string
{
    $n = (float)$amount;
    return '৳' . number_format($n, floor($n) == $n ? 0 : 2);
}

// text length that also works if the mbstring extension is missing
function text_len(string $text): int
{
    return function_exists('mb_strlen') ? mb_strlen($text, 'UTF-8') : strlen($text);
}

function make_slug(string $text): string
{
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $text), '-'));
    return $slug !== '' ? $slug : 'item';
}

// AJAX = the page was called by JavaScript fetch() (see assets/js/main.js)
function is_ajax(): bool
{
    return ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch';
}

// Send a JSON answer to JavaScript and stop
function json_out(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- 2) flash messages (one-time messages) ---------- */

function flash(string $type, string $message): void
{
    $_SESSION['flash'][] = ['type' => $type, 'message' => $message];
}

function show_flash(): void
{
    if (empty($_SESSION['flash'])) {
        return;
    }
    foreach ($_SESSION['flash'] as $f) {
        echo '<div class="alert alert-' . e($f['type']) . '">' . e($f['message']) . '</div>';
    }
    unset($_SESSION['flash']);
}

/* ---------- 3) CSRF protection for every POST form ---------- */

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check(): void
{
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || !hash_equals($_SESSION['csrf'] ?? '', $sent)) {
        if (is_ajax()) {
            json_out(['ok' => false, 'message' => 'Session expired. Please refresh the page.'], 400);
        }
        http_response_code(400);
        exit('Invalid or expired form. Go back, refresh the page and try again.');
    }
}

/* ---------- 4) login helpers ---------- */

function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    static $user = false;
    if ($user === false) {
        $st = db()->prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?');
        $st->execute([$_SESSION['user_id']]);
        $user = $st->fetch() ?: null;
    }
    return $user;
}

function require_login(): array
{
    $u = current_user();
    if (!$u) {
        flash('info', 'Please login first.');
        redirect('login.php');
    }
    return $u;
}

function require_admin(): array
{
    $u = current_user();
    if (!$u || $u['role'] !== 'admin') {
        redirect('admin/login.php');
    }
    return $u;
}

function login_user(int $id): void
{
    session_regenerate_id(true); // new session id after login
    $_SESSION['user_id'] = $id;
}

function logout_user(): void
{
    $_SESSION = [];
    session_destroy();
}

/* ---------- 5) shopping cart & coupons (cart is stored in the session: product_id => quantity) ---------- */

function cart_ids(): array
{
    return $_SESSION['cart'] ?? [];
}

function cart_count(): int
{
    return array_sum(cart_ids());
}

// Adds a product. Returns '' if OK, or a message to show the user.
function cart_add(int $productId, int $qty = 1): string
{
    $st = db()->prepare('SELECT id, name, stock FROM products WHERE id = ? AND active = 1');
    $st->execute([$productId]);
    $p = $st->fetch();
    if (!$p) {
        return 'Product not found.';
    }
    if ($p['stock'] <= 0) {
        return $p['name'] . ' is out of stock.';
    }
    $want = ($_SESSION['cart'][$productId] ?? 0) + max(1, $qty);
    if ($want > $p['stock']) {
        $_SESSION['cart'][$productId] = (int)$p['stock'];
        return 'Only ' . $p['stock'] . ' of ' . $p['name'] . ' available. Cart updated.';
    }
    $_SESSION['cart'][$productId] = $want;
    return '';
}

// Returns [ list of cart lines, subtotal ]. Prices always come from the DATABASE, never from the browser.
function cart_lines(): array
{
    $cart = cart_ids();
    if (!$cart) {
        return [[], 0.0];
    }
    $ids = array_map('intval', array_keys($cart));
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $st = db()->prepare("SELECT * FROM products WHERE active = 1 AND id IN ($marks)");
    $st->execute($ids);
    $lines = [];
    $subtotal = 0.0;
    foreach ($st->fetchAll() as $p) {
        $qty = min((int)$cart[$p['id']], max(0, (int)$p['stock']));
        if ($qty < 1) {
            continue;
        }
        $total = $qty * (float)$p['price'];
        $subtotal += $total;
        $lines[] = ['product' => $p, 'qty' => $qty, 'total' => $total];
    }
    return [$lines, $subtotal];
}

function delivery_charge(string $area, float $subtotal): float
{
    if (FREE_DELIVERY_OVER > 0 && $subtotal >= FREE_DELIVERY_OVER) {
        return 0.0;
    }
    return (float)($area === 'outside' ? DELIVERY_OUTSIDE : DELIVERY_INSIDE);
}

// Checks a coupon code against all rules. Returns [coupon row or null, error message].
function coupon_check(string $code, float $subtotal): array
{
    $code = strtoupper(trim($code));
    if ($code === '') {
        return [null, 'Please enter a coupon code.'];
    }
    $st = db()->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1');
    $st->execute([$code]);
    $c = $st->fetch();
    if (!$c) {
        return [null, 'This coupon code is not valid.'];
    }
    if ($c['expires_on'] !== null && $c['expires_on'] < date('Y-m-d')) {
        return [null, 'This coupon has expired.'];
    }
    if ($c['max_uses'] !== null && (int)$c['used_count'] >= (int)$c['max_uses']) {
        return [null, 'This coupon has already been fully used.'];
    }
    if ($subtotal < (float)$c['min_order']) {
        return [null, 'Minimum order for this coupon is ' . money($c['min_order']) . '.'];
    }
    return [$c, ''];
}

// How many Taka this coupon takes off
function coupon_amount(array $c, float $subtotal): float
{
    $off = $c['type'] === 'percent' ? $subtotal * (float)$c['value'] / 100 : (float)$c['value'];
    return round(min($off, $subtotal), 2);
}

// All money numbers of the cart in one place: subtotal, discount, delivery, total.
function cart_totals(float $subtotal, string $area = 'inside'): array
{
    $coupon = null;
    $discount = 0.0;
    $code = $_SESSION['coupon'] ?? '';
    if ($code !== '') {
        [$coupon, $err] = coupon_check($code, $subtotal);
        if ($coupon) {
            $discount = coupon_amount($coupon, $subtotal);
        } else {
            unset($_SESSION['coupon']);          // no longer valid
            flash('info', 'Coupon removed: ' . $err);
        }
    }
    $delivery = delivery_charge($area, $subtotal);
    return [
        'subtotal' => $subtotal,
        'discount' => $discount,
        'coupon'   => $coupon,
        'delivery' => $delivery,
        'total'    => $subtotal - $discount + $delivery,
    ];
}

/* ---------- 6) product image upload (admin) ---------- */

// Returns [filename or null, error message]
function save_product_image(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return [null, ''];
    }
    if ($file['error'] !== UPLOAD_ERR_OK || $file['size'] > MAX_UPLOAD_BYTES) {
        return [null, 'Image upload failed or is bigger than 2 MB.'];
    }
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if (!isset($allowed[$mime])) {
        return [null, 'Only JPG, PNG or WEBP images are allowed.'];
    }
    $name = bin2hex(random_bytes(8)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($file['tmp_name'], dirname(__DIR__) . '/uploads/' . $name)) {
        return [null, 'Could not save the image. Check the uploads folder permission.'];
    }
    return [$name, ''];
}

// delete an uploaded image file (only if the name looks like one of ours)
function delete_product_image(?string $name): void
{
    if ($name && preg_match('/^[a-f0-9]+\.(jpg|png|webp)$/', $name)) {
        @unlink(dirname(__DIR__) . '/uploads/' . $name);
    }
}

/* ---------- 7) view helpers ---------- */

// HTML for a product picture: uploaded image, or the emoji
function product_pic(array $p): string
{
    if (!empty($p['image'])) {
        return '<img src="' . e(url('uploads/' . $p['image'])) . '" alt="' . e($p['name']) . '" loading="lazy">';
    }
    return '<span class="emoji" role="img" aria-label="' . e($p['name']) . '">' . e($p['emoji'] ?: '🛒') . '</span>';
}

function order_status_label(string $s): string
{
    $labels = ['pending' => 'Pending', 'confirmed' => 'Confirmed', 'shipped' => 'On the way',
               'delivered' => 'Delivered', 'cancelled' => 'Cancelled'];
    return $labels[$s] ?? $s;
}

// A product card used on the home page, shop page and related products
function product_card(array $p): void
{
    $out  = (int)$p['stock'] <= 0;
    $link = e(url('product.php?slug=' . urlencode($p['slug'])));
    $sale = $p['old_price'] && (float)$p['old_price'] > (float)$p['price'];
    ?>
    <article class="card product-card">
      <div class="pic">
        <a href="<?= $link ?>" tabindex="-1" aria-hidden="true"><?= product_pic($p) ?></a>
        <button type="button" class="wish" data-wish="<?= (int)$p['id'] ?>" aria-pressed="false" aria-label="Add to wishlist">♡</button>
      </div>
      <div class="card-body">
        <div class="badges">
          <?php if ($p['is_rx']): ?><span class="badge badge-rx">Rx</span><?php endif; ?>
          <?php if ($sale): ?><span class="badge badge-sale"><?= round(((float)$p['old_price'] - (float)$p['price']) / (float)$p['old_price'] * 100) ?>% off</span><?php endif; ?>
        </div>
        <h3><a href="<?= $link ?>"><?= e($p['name']) ?></a></h3>
        <p class="muted small"><?= e($p['unit']) ?></p>
        <p class="price">
          <strong><?= money($p['price']) ?></strong>
          <?php if ($sale): ?><s class="muted small"><?= money($p['old_price']) ?></s><?php endif; ?>
        </p>
        <?php if ($out): ?>
          <button class="btn btn-disabled" disabled>Out of stock</button>
        <?php else: ?>
          <form method="post" action="<?= e(url('cart.php')) ?>" data-ajax-cart>
            <?= csrf_field() ?>
            <input type="hidden" name="action" value="add">
            <input type="hidden" name="product_id" value="<?= (int)$p['id'] ?>">
            <button class="btn btn-primary btn-block">Add to cart</button>
          </form>
        <?php endif; ?>
      </div>
    </article>
    <?php
}
