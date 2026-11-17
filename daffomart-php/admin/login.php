<?php
/*
 * admin/login.php  -  ADMIN LOGIN (only users with role = 'admin' can enter)
 */
require_once __DIR__ . '/../includes/functions.php';

$u = current_user();
if ($u && $u['role'] === 'admin') {
    redirect('admin/index.php');
}

$error = '';
$email = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $email = trim($_POST['email'] ?? '');
    $st = db()->prepare("SELECT id, password_hash FROM users WHERE email = ? AND role = 'admin'");
    $st->execute([$email]);
    $row = $st->fetch();
    if ($row && password_verify($_POST['password'] ?? '', $row['password_hash'])) {
        login_user((int)$row['id']);
        redirect('admin/index.php');
    }
    $error = 'Wrong email or password.';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Admin login | <?= e(STORE_NAME) ?></title>
  <link rel="stylesheet" href="<?= e(url('assets/css/style.css')) ?>">
</head>
<body class="admin-body">
  <div class="card form-card narrow" style="margin-top:8vh">
    <h1>Admin login</h1>
    <?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>
    <form method="post" novalidate>
      <?= csrf_field() ?>
      <label>Email <input type="email" name="email" value="<?= e($email) ?>" required></label>
      <label>Password <input type="password" name="password" required></label>
      <button class="btn btn-primary btn-block">Login</button>
    </form>
    <p class="small"><a href="<?= e(url('index.php')) ?>">&larr; Back to website</a></p>
  </div>
  <script src="<?= e(url('assets/js/main.js')) ?>"></script>
</body>
</html>
