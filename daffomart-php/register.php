<?php
/*
 * register.php  -  CREATE A CUSTOMER ACCOUNT
 * The password is stored as a hash (password_hash), never as plain text.
 */
require_once __DIR__ . '/includes/functions.php';

if (current_user()) {
    redirect('account.php');
}

$errors = [];
$old = ['name' => '', 'email' => '', 'phone' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $old['name']  = trim($_POST['name'] ?? '');
    $old['email'] = trim($_POST['email'] ?? '');
    $old['phone'] = trim($_POST['phone'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm  = $_POST['confirm'] ?? '';

    if (mb_strlen($old['name']) < 2)                         { $errors[] = 'Please enter your name.'; }
    if (!filter_var($old['email'], FILTER_VALIDATE_EMAIL))   { $errors[] = 'Please enter a valid email.'; }
    if (!preg_match('/^01[3-9][0-9]{8}$/', $old['phone']))   { $errors[] = 'Enter a valid mobile number (example: 01712345678).'; }
    if (strlen($password) < 6)                               { $errors[] = 'Password must be at least 6 characters.'; }
    if ($password !== $confirm)                              { $errors[] = 'Passwords do not match.'; }

    if (!$errors) {
        $st = db()->prepare('SELECT COUNT(*) FROM users WHERE email = ?');
        $st->execute([$old['email']]);
        if ($st->fetchColumn() > 0) {
            $errors[] = 'This email is already registered. Please login.';
        }
    }

    if (!$errors) {
        $st = db()->prepare("INSERT INTO users (name, email, phone, password_hash, role) VALUES (?,?,?,?, 'customer')");
        $st->execute([$old['name'], $old['email'], $old['phone'], password_hash($password, PASSWORD_DEFAULT)]);
        login_user((int)db()->lastInsertId());
        flash('success', 'Account created. Welcome to ' . STORE_NAME . '!');
        redirect('account.php');
    }
}

$pageTitle = 'Create account';
require __DIR__ . '/includes/header.php';
?>

<div class="auth-box card form-card narrow">
  <h1>Create account</h1>
  <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

  <form method="post" id="registerForm" novalidate>
    <?= csrf_field() ?>
    <label>Full name
      <input type="text" name="name" value="<?= e($old['name']) ?>" required>
    </label>
    <label>Email
      <input type="email" name="email" value="<?= e($old['email']) ?>" required autocomplete="email">
    </label>
    <label>Mobile number
      <input type="tel" name="phone" value="<?= e($old['phone']) ?>" placeholder="01712345678" required>
    </label>
    <label>Password (min 6 characters)
      <input type="password" name="password" required autocomplete="new-password">
    </label>
    <label>Confirm password
      <input type="password" name="confirm" required autocomplete="new-password">
    </label>
    <button class="btn btn-primary btn-block">Register</button>
  </form>

  <p class="muted">Already have an account? <a href="<?= e(url('login.php')) ?>">Login</a></p>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
