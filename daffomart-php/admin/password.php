<?php
/*
 * admin/password.php  -  change the admin password (do this before going live!)
 */
require_once __DIR__ . '/_init.php';
$adminPage = 'password';
$pageTitle = 'Change password';

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $current = $_POST['current'] ?? '';
    $new     = $_POST['new'] ?? '';
    $confirm = $_POST['confirm'] ?? '';

    $st = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
    $st->execute([$admin['id']]);
    if (!password_verify($current, (string)$st->fetchColumn())) { $errors[] = 'Current password is wrong.'; }
    if (strlen($new) < 8)   { $errors[] = 'New password must be at least 8 characters.'; }
    if ($new !== $confirm)  { $errors[] = 'New passwords do not match.'; }

    if (!$errors) {
        db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            ->execute([password_hash($new, PASSWORD_DEFAULT), $admin['id']]);
        flash('success', 'Password changed.');
        redirect('admin/password.php');
    }
}

require __DIR__ . '/_top.php';
?>

<div class="admin-top"><h1>Change password</h1></div>
<?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

<form method="post" class="card form-card narrow" style="margin-left:0">
  <?= csrf_field() ?>
  <label>Current password <input type="password" name="current" required></label>
  <label>New password (min 8 characters) <input type="password" name="new" required></label>
  <label>Confirm new password <input type="password" name="confirm" required></label>
  <button class="btn btn-primary">Change password</button>
</form>

<?php require __DIR__ . '/_bottom.php'; ?>
