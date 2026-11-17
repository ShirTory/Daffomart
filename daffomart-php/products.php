<?php
/*
 * products.php  -  SHOP PAGE
 * Filters come from the URL (GET):  ?q=milk  &cat=veg  &kind=medicine  &sort=price_asc  &page=2
 */
require_once __DIR__ . '/includes/functions.php';

$pdo = db();

// 1) read filters from the URL
$q    = input_str($_GET, 'q');
$cat  = input_str($_GET, 'cat');
$kind = input_str($_GET, 'kind');
$kind = in_array($kind, ['medicine', 'grocery'], true) ? $kind : '';
$sort = input_str($_GET, 'sort') ?: 'new';
$page = max(1, (int)input_str($_GET, 'page'));

// 2) build the WHERE part safely (values go into $params, never directly into SQL)
$where  = ['p.active = 1'];
$params = [];
if ($q !== '') {
    $where[]  = '(p.name LIKE ? OR p.generic_name LIKE ?)';
    $params[] = '%' . $q . '%';
    $params[] = '%' . $q . '%';
}
if ($cat !== '') {
    $where[]  = 'c.slug = ?';
    $params[] = $cat;
}
if ($kind !== '') {
    $where[]  = 'c.kind = ?';
    $params[] = $kind;
}
$whereSql = implode(' AND ', $where);

// 3) sorting (only allowed values are used)
$orders = [
    'new'        => 'p.created_at DESC, p.id DESC',
    'price_asc'  => 'p.price ASC',
    'price_desc' => 'p.price DESC',
    'name'       => 'p.name ASC',
];
$orderSql = $orders[$sort] ?? $orders['new'];

// 4) count + pagination
$st = $pdo->prepare("SELECT COUNT(*) FROM products p JOIN categories c ON c.id = p.category_id WHERE $whereSql");
$st->execute($params);
$total      = (int)$st->fetchColumn();
$perPage    = PRODUCTS_PER_PAGE;
$totalPages = max(1, (int)ceil($total / $perPage));
$page       = min($page, $totalPages);
$offset     = ($page - 1) * $perPage;

// 5) get the products of this page
$st = $pdo->prepare(
    "SELECT p.* FROM products p JOIN categories c ON c.id = p.category_id
     WHERE $whereSql ORDER BY $orderSql LIMIT $perPage OFFSET $offset"
);
$st->execute($params);
$products = $st->fetchAll();

$categories = $pdo->query('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, name')->fetchAll();

// helper: keep the current filters when making links
function shop_link(array $change): string
{
    $query = array_merge($_GET, $change);
    return url('products.php?' . http_build_query(array_filter($query, fn($v) => $v !== '' && $v !== null)));
}

$pageTitle = $kind === 'medicine' ? 'Medicine' : 'Shop';
require __DIR__ . '/includes/header.php';
?>

<h1><?= $kind === 'medicine' ? 'Medicine &amp; Healthcare' : 'All products' ?></h1>

<div class="shop-layout">

  <!-- Sidebar: categories -->
  <aside class="sidebar card">
    <h3>Categories</h3>
    <ul>
      <li><a class="<?= $cat === '' ? 'active' : '' ?>" href="<?= e(shop_link(['cat' => '', 'page' => 1])) ?>">All</a></li>
      <?php foreach ($categories as $c): ?>
        <li>
          <a class="<?= $cat === $c['slug'] ? 'active' : '' ?>" href="<?= e(shop_link(['cat' => $c['slug'], 'kind' => '', 'page' => 1])) ?>">
            <?= e($c['emoji'] . ' ' . $c['name']) ?>
          </a>
        </li>
      <?php endforeach; ?>
    </ul>
  </aside>

  <section>
    <!-- Sort bar -->
    <form class="sortbar" method="get">
      <?php foreach (['q' => $q, 'cat' => $cat, 'kind' => $kind] as $k => $v): ?>
        <?php if ($v !== ''): ?><input type="hidden" name="<?= e($k) ?>" value="<?= e($v) ?>"><?php endif; ?>
      <?php endforeach; ?>
      <span class="muted"><?= $total ?> product<?= $total === 1 ? '' : 's' ?><?= $q !== '' ? ' for "' . e($q) . '"' : '' ?></span>
      <label>Sort:
        <select name="sort" onchange="this.form.submit()">
          <option value="new"        <?= $sort === 'new' ? 'selected' : '' ?>>Newest</option>
          <option value="price_asc"  <?= $sort === 'price_asc' ? 'selected' : '' ?>>Price: low to high</option>
          <option value="price_desc" <?= $sort === 'price_desc' ? 'selected' : '' ?>>Price: high to low</option>
          <option value="name"       <?= $sort === 'name' ? 'selected' : '' ?>>Name A-Z</option>
        </select>
      </label>
      <noscript><button class="btn btn-outline btn-sm">Apply</button></noscript>
    </form>

    <?php if ($products): ?>
      <div class="product-grid">
        <?php foreach ($products as $p) { product_card($p); } ?>
      </div>

      <!-- Pagination -->
      <?php if ($totalPages > 1): ?>
        <nav class="pagination">
          <?php for ($i = 1; $i <= $totalPages; $i++): ?>
            <a class="<?= $i === $page ? 'active' : '' ?>" href="<?= e(shop_link(['page' => $i])) ?>"><?= $i ?></a>
          <?php endfor; ?>
        </nav>
      <?php endif; ?>
    <?php else: ?>
      <div class="empty card">
        <p class="big">🔍</p>
        <h3>No products found</h3>
        <p class="muted">Try a different search or category.</p>
      </div>
    <?php endif; ?>
  </section>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
