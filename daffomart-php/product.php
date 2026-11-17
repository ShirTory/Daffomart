<?php
/*
 * product.php  -  PRODUCT DETAILS PAGE   (example: product.php?slug=fresh-tomato)
 * Also prints "structured data" (JSON-LD) so Google can show price and stock in search results.
 */
require_once __DIR__ . '/includes/functions.php';

$slug = input_str($_GET, 'slug');
$st = db()->prepare(
    'SELECT p.*, c.name AS category_name, c.slug AS category_slug, c.kind
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.slug = ? AND p.active = 1'
);
$st->execute([$slug]);
$p = $st->fetch();

if (!$p) {
    require __DIR__ . '/404.php';
    exit;
}

// Related products from the same category
$st = db()->prepare('SELECT * FROM products WHERE category_id = ? AND id <> ? AND active = 1 ORDER BY RAND() LIMIT 4');
$st->execute([$p['category_id'], $p['id']]);
$related = $st->fetchAll();

$out  = (int)$p['stock'] <= 0;
$sale = $p['old_price'] && (float)$p['old_price'] > (float)$p['price'];

// ---- SEO: title, description, share image, structured data ----
$pageTitle = $p['name'];
$metaDesc  = trim(mb_substr_safe($p['description'] ?: ($p['name'] . ' - ' . $p['unit'] . ' at ' . STORE_NAME), 155));
$canonicalQuery = 'slug=' . urlencode($p['slug']);
$ogImage = $p['image'] ? site_origin() . url('uploads/' . $p['image']) : site_origin() . url('assets/img/logo.png');
$jsonLd = json_encode([
    '@context'    => 'https://schema.org',
    '@type'       => 'Product',
    'name'        => $p['name'],
    'description' => $p['description'] ?: $p['name'],
    'sku'         => 'DM-' . $p['id'],
    'image'       => [$ogImage],
    'offers'      => [
        '@type'         => 'Offer',
        'priceCurrency' => 'BDT',
        'price'         => number_format((float)$p['price'], 2, '.', ''),
        'availability'  => $out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG);

// first N characters of text (works even without the mbstring extension)
function mb_substr_safe(string $text, int $length): string
{
    $text = preg_replace('/\s+/', ' ', $text);
    return function_exists('mb_substr') ? mb_substr($text, 0, $length, 'UTF-8') : substr($text, 0, $length);
}

require __DIR__ . '/includes/header.php';
?>

<p class="breadcrumb">
  <a href="<?= e(url('index.php')) ?>">Home</a> /
  <a href="<?= e(url('products.php?cat=' . urlencode($p['category_slug']))) ?>"><?= e($p['category_name']) ?></a> /
  <?= e($p['name']) ?>
</p>

<div class="detail card">
  <div class="detail-pic"><?= product_pic($p) ?></div>

  <div class="detail-info">
    <h1><?= e($p['name']) ?></h1>
    <?php if ($p['generic_name']): ?><p class="muted">Generic: <?= e($p['generic_name']) ?></p><?php endif; ?>
    <p class="muted"><?= e($p['unit']) ?></p>

    <p class="price big-price">
      <strong><?= money($p['price']) ?></strong>
      <?php if ($sale): ?>
        <s class="muted"><?= money($p['old_price']) ?></s>
        <span class="badge badge-sale">Save <?= money((float)$p['old_price'] - (float)$p['price']) ?></span>
      <?php endif; ?>
    </p>

    <p><?= nl2br(e($p['description'])) ?></p>

    <?php if ($p['is_rx']): ?>
      <div class="alert alert-info">Prescription (Rx) medicine. Our pharmacist will confirm your prescription by phone before delivery.</div>
    <?php endif; ?>

    <p><?= $out ? '<span class="badge badge-out">Out of stock</span>' : '<span class="badge badge-ok">In stock (' . (int)$p['stock'] . ' available)</span>' ?></p>

    <div class="buy-row">
      <?php if (!$out): ?>
        <form method="post" action="<?= e(url('cart.php')) ?>" class="buy-form" data-ajax-cart>
          <?= csrf_field() ?>
          <input type="hidden" name="action" value="add">
          <input type="hidden" name="product_id" value="<?= (int)$p['id'] ?>">
          <label>Quantity
            <input type="number" data-stepper name="qty" value="1" min="1" max="<?= (int)$p['stock'] ?>">
          </label>
          <button class="btn btn-primary">Add to cart</button>
        </form>
      <?php endif; ?>
      <button type="button" class="btn btn-outline wish-btn" data-wish="<?= (int)$p['id'] ?>" aria-pressed="false">♡ Wishlist</button>
    </div>
  </div>
</div>

<?php if ($related): ?>
  <h2 class="section-title">You may also like</h2>
  <div class="product-grid">
    <?php foreach ($related as $r) { product_card($r); } ?>
  </div>
<?php endif; ?>

<?php require __DIR__ . '/includes/footer.php'; ?>
