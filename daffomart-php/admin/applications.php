<?php
/*
 * admin/applications.php  -  rider applications sent from the public "Join as rider" page (join.php).
 * The admin approves or rejects each one.
 */
require_once __DIR__ . '/_init.php';
$adminPage = 'applications';
$pageTitle = 'Rider applications';

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = input_str($_POST, 'action');
    $id = (int)input_str($_POST, 'id');

    if ($action === 'status' && in_array(input_str($_POST, 'status'), ['new', 'approved', 'rejected'], true)) {
        $pdo->prepare('UPDATE rider_applications SET status = ? WHERE id = ?')->execute([input_str($_POST, 'status'), $id]);
        flash('success', 'Application updated.');
    }
    if ($action === 'delete') {
        $pdo->prepare('DELETE FROM rider_applications WHERE id = ?')->execute([$id]);
        flash('success', 'Application deleted.');
    }
    redirect('admin/applications.php');
}

$apps = $pdo->query("SELECT * FROM rider_applications ORDER BY (status = 'new') DESC, created_at DESC")->fetchAll();

require __DIR__ . '/_top.php';
?>

<div class="admin-top"><h1>Rider applications (<?= count($apps) ?>)</h1></div>

<div class="card table-wrap">
  <table class="table">
    <thead><tr><th>Name</th><th>Phone</th><th>Area</th><th>Vehicle</th><th>Message</th><th>Date</th><th>Status</th><th></th></tr></thead>
    <tbody>
      <?php foreach ($apps as $a): ?>
        <tr>
          <td><strong><?= e($a['name']) ?></strong></td>
          <td><?= e($a['phone']) ?></td>
          <td><?= e($a['area']) ?></td>
          <td><?= e(ucfirst($a['vehicle'])) ?></td>
          <td class="small"><?= nl2br(e($a['message'])) ?></td>
          <td><?= e(date('d M Y', strtotime($a['created_at']))) ?></td>
          <td>
            <form method="post" class="actions">
              <?= csrf_field() ?>
              <input type="hidden" name="action" value="status">
              <input type="hidden" name="id" value="<?= (int)$a['id'] ?>">
              <select name="status" onchange="this.form.submit()" aria-label="Application status">
                <?php foreach (['new' => 'New', 'approved' => 'Approved', 'rejected' => 'Rejected'] as $k => $label): ?>
                  <option value="<?= e($k) ?>" <?= $a['status'] === $k ? 'selected' : '' ?>><?= e($label) ?></option>
                <?php endforeach; ?>
              </select>
              <noscript><button class="btn btn-outline btn-sm">Save</button></noscript>
            </form>
          </td>
          <td>
            <form method="post" data-confirm="Delete this application?">
              <?= csrf_field() ?>
              <input type="hidden" name="action" value="delete">
              <input type="hidden" name="id" value="<?= (int)$a['id'] ?>">
              <button class="btn btn-danger btn-sm">Delete</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$apps): ?><tr><td colspan="8" class="muted">No applications yet.</td></tr><?php endif; ?>
    </tbody>
  </table>
</div>

<?php require __DIR__ . '/_bottom.php'; ?>
