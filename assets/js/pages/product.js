/* product.js  -  PRODUCT DETAILS (replaces product.php)   example: product.html?slug=fresh-tomato
   Also writes the SEO tags and "structured data" (JSON-LD) so Google can show price and stock. */
(async function () {
  var esc = DM.esc;
  var box = document.getElementById('productView');
  var slug = DM.param('slug');

  function notFound() {
    document.title = 'Page not found | ' + DM.cfg.store.name;
    box.innerHTML = '<div class="empty card"><p class="big">🧭</p><h1>Product not found</h1>' +
      '<p class="muted">The product you are looking for does not exist or was removed.</p>' +
      '<a class="btn btn-primary" href="products.html">Browse products</a> <a class="btn btn-outline" href="index.html">Go home</a></div>';
  }

  try {
    var catalog = await DM.db.getCatalog();
    var p = DM.findProduct(catalog, slug);
    if (!p) { notFound(); return; }
    var category = catalog.categories.filter(function (c) { return c.id === p.categoryId; })[0];
    var out = p.stock <= 0;
    var sale = p.oldPrice && p.oldPrice > p.price;

    // ---- SEO: title, description, structured data ----
    var desc = (p.description || (p.name + ' - ' + p.unit + ' at ' + DM.cfg.store.name)).replace(/\s+/g, ' ').slice(0, 155);
    document.title = p.name + ' | ' + DM.cfg.store.name;
    [['meta[name="description"]', desc], ['meta[property="og:title"]', document.title], ['meta[property="og:description"]', desc]].forEach(function (pair) {
      var m = document.querySelector(pair[0]);
      if (m) { m.setAttribute('content', pair[1]); }
    });
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product',
      name: p.name, description: p.description || p.name, sku: 'DM-' + p.id,
      image: p.image && p.image.indexOf('http') === 0 ? [p.image] : undefined,
      offers: {
        '@type': 'Offer', priceCurrency: 'BDT', price: Number(p.price).toFixed(2),
        availability: out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'
      }
    });
    document.head.appendChild(ld);

    // related products: same category, random 4
    var related = catalog.products.filter(function (r) { return r.categoryId === p.categoryId && r.id !== p.id; })
      .sort(function () { return Math.random() - 0.5; }).slice(0, 4);

    box.innerHTML =
      '<p class="breadcrumb"><a href="index.html">Home</a> / <a href="products.html?cat=' + encodeURIComponent(p.categoryId) + '">' + esc(category ? category.name : '') + '</a> / ' + esc(p.name) + '</p>' +
      '<div class="detail card">' +
        '<div class="detail-pic">' + DM.productPic(p) + '</div>' +
        '<div class="detail-info">' +
          '<h1>' + esc(p.name) + '</h1>' +
          (p.genericName ? '<p class="muted">Generic: ' + esc(p.genericName) + '</p>' : '') +
          '<p class="muted">' + esc(p.unit) + '</p>' +
          '<p class="price big-price"><strong>' + DM.money(p.price) + '</strong>' +
            (sale ? ' <s class="muted">' + DM.money(p.oldPrice) + '</s> <span class="badge badge-sale">Save ' + DM.money(p.oldPrice - p.price) + '</span>' : '') + '</p>' +
          '<p style="white-space:pre-line">' + esc(p.description) + '</p>' +
          (p.isRx ? '<div class="alert alert-info">Prescription (Rx) medicine. Our pharmacist will confirm your prescription by phone before delivery.</div>' : '') +
          '<p>' + (out ? '<span class="badge badge-out">Out of stock</span>' : '<span class="badge badge-ok">In stock (' + p.stock + ' available)</span>') + '</p>' +
          '<div class="buy-row">' +
            (out ? '' : '<div class="buy-form"><label>Quantity <input type="number" id="qty" data-stepper value="1" min="1" max="' + p.stock + '"></label>' +
              '<button type="button" class="btn btn-primary" data-add="' + esc(p.id) + '" data-qty-input="qty">Add to cart</button></div>') +
            '<button type="button" class="btn btn-outline wish-btn" data-wish="' + esc(p.id) + '" aria-pressed="false">♡ Wishlist</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (related.length ? '<h2 class="section-title">You may also like</h2><div class="product-grid">' + related.map(DM.productCard).join('') + '</div>' : '');

    document.dispatchEvent(new Event('dm:rendered'));
  } catch (err) {
    DM.fail(box, err);
  }
})();
