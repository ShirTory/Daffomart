<?php
/*
 * login.php  -  CUSTOMER LOGIN
 * password_verify() compares the typed password with the hash stored in the database.
 */
require_once __DIR__ . '/includes/functions.php';

if (current_user()) {
    redirect('account.php');
}

$error = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    $st = db()->prepare("SELECT id, password_hash FROM users WHERE email = ? AND role = 'customer'");
    $st->execute([$email]);
    $row = $st->fetch();

    if ($row && password_verify($password, $row['password_hash'])) {
        login_user((int)$row['id']);
        flash('success', 'Welcome back!');
        redirect('account.php');
    }
    $error = 'Wrong email or password.';
}

$pageTitle = 'Login';
require __DIR__ . '/includes/header.php';
?>

<div class="auth-box card form-card narrow">
  <h1>Login</h1>
  <?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>

  <form method="post" id="loginForm" novalidate>
    <?= csrf_field() ?>
    <label>Email
      <input type="email" name="email" value="<?= e($email) ?>" required autocomplete="email">
    </label>
    <label>Password
      <input type="password" name="password" required autocomplete="current-password">
    </label>
    <button class="btn btn-primary btn-block">Login</button>
  </form>

  <p class="muted">New here? <a href="<?= e(url('register.php')) ?>">Create an account</a></p>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
