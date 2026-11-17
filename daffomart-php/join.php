<?php
/*
 * join.php  -  "JOIN AS A RIDER" application form.
 * The application is saved in the database; the admin approves it in admin/applications.php.
 */
require_once __DIR__ . '/includes/functions.php';

$errors = [];
$old = ['name' => '', 'phone' => '', 'area' => '', 'vehicle' => 'bike', 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $old['name']    = input_str($_POST, 'name');
    $old['phone']   = input_str($_POST, 'phone');
    $old['area']    = input_str($_POST, 'area');
    $old['vehicle'] = in_array(input_str($_POST, 'vehicle'), ['bike', 'cycle', 'walk'], true) ? input_str($_POST, 'vehicle') : 'bike';
    $old['message'] = input_str($_POST, 'message');

    if (text_len($old['name']) < 2)                         { $errors[] = 'Please enter your full name.'; }
    if (!preg_match('/^01[3-9][0-9]{8}$/', $old['phone']))  { $errors[] = 'Enter a valid mobile number (example: 01712345678).'; }
    if (text_len($old['area']) < 2)                         { $errors[] = 'Please enter the area where you can deliver.'; }
    if (text_len($old['message']) > 500)                    { $errors[] = 'Message is too long (max 500 characters).'; }

    if (!$errors) {
        // stop the same phone number from sending many applications
        $chk = db()->prepare("SELECT COUNT(*) FROM rider_applications WHERE phone = ? AND status = 'new'");
        $chk->execute([$old['phone']]);
        if ($chk->fetchColumn() > 0) {
            $errors[] = 'We already have an application from this number. We will call you soon.';
        }
    }

    if (!$errors) {
        db()->prepare('INSERT INTO rider_applications (name, phone, area, vehicle, message) VALUES (?,?,?,?,?)')
            ->execute([$old['name'], $old['phone'], $old['area'], $old['vehicle'], $old['message']]);
        flash('success', 'Thank you! Your rider application was sent. We will contact you by phone.');
        redirect('join.php');
    }
}

$pageTitle = 'Join as a delivery rider';
$metaDesc  = 'Apply to become a delivery rider for ' . STORE_NAME . '.';
require __DIR__ . '/includes/header.php';
?>

<div class="card form-card narrow">
  <h1>Join as a rider</h1>
  <p class="muted">Deliver groceries and medicine in your area. Send your details and our team will call you.</p>

  <?php foreach ($errors as $err): ?><div class="alert alert-error"><?= e($err) ?></div><?php endforeach; ?>

  <form method="post" novalidate>
    <?= csrf_field() ?>
    <label>Full name
      <input type="text" name="name" value="<?= e($old['name']) ?>" required autocomplete="name">
    </label>
    <label>Mobile number
      <input type="tel" name="phone" value="<?= e($old['phone']) ?>" placeholder="01712345678" required autocomplete="tel">
    </label>
    <label>Delivery area
      <input type="text" name="area" value="<?= e($old['area']) ?>" placeholder="e.g. Mirpur, Dhaka" required>
    </label>
    <label>Vehicle
      <select name="vehicle">
        <option value="bike"  <?= $old['vehicle'] === 'bike'  ? 'selected' : '' ?>>Motorbike</option>
        <option value="cycle" <?= $old['vehicle'] === 'cycle' ? 'selected' : '' ?>>Bicycle</option>
        <option value="walk"  <?= $old['vehicle'] === 'walk'  ? 'selected' : '' ?>>On foot</option>
      </select>
    </label>
    <label>Message (optional)
      <textarea name="message" rows="3" maxlength="500"><?= e($old['message']) ?></textarea>
    </label>
    <button class="btn btn-primary btn-block">Send application</button>
  </form>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
