/* Product page: pictures, options (size/weight/colour), quantity, add to cart, related products. */
DM.ready(function (st) {
  var esc = DM.esc, box = document.getElementById('detail'), slug = DM.param('slug');
  if (!slug) { box.innerHTML = '<div class="empty"><h2>Product not found</h2><a class="btn btn-primary" href="/products.html">Back to shop</a></div>'; return; }
  DM.api('GET', '/products/' + encodeURIComponent(slug)).then(function (p) {
    document.title = p.name + ' | ' + st.settings.storeName;
    var hasV = p.variants && p.variants.length, chosen = null;
    var imgs = (p.images && p.images.length ? p.images : (p.image ? [p.image] : []));
    var cat = st.categories.filter(function (c) { return c.id === p.categoryId; })[0];
    var gallery = imgs.length ? '<img id="mainPic" src="' + esc(imgs[0]) + '" alt="' + esc(p.name) + '">' + (imgs.length > 1 ? '<div class="thumbs">' + imgs.map(function (u, i) { return '<button type="button" data-img="' + esc(u) + '" class="' + (i ? '' : 'on') + '"><img src="' + esc(u) + '" alt=""></button>'; }).join('') + '</div>' : '') : '<span class="emoji big">' + esc(p.emoji || '🛒') + '</span>';
    box.innerHTML = '<div class="breadcrumb"><a href="/">Home</a> / ' + (cat ? '<a href="/products.html?cat=' + esc(cat.id) + '">' + esc(cat.name) + '</a> / ' : '') + esc(p.name) + '</div>' +
      '<div class="detail"><div class="detail-pic card">' + gallery + '</div><div class="detail-info">' +
      '<div class="badges">' + DM.labelsFor(p, st.settings.labelRules) + '</div><h1>' + esc(p.name) + '</h1>' +
      (p.genericName ? '<p class="muted">' + esc(p.genericName) + (p.manufacturer ? ' · ' + esc(p.manufacturer) : '') + '</p>' : '') +
      '<p class="big-price" id="priceBox"></p><p id="stockBox"></p>' +
      (hasV ? '<div class="variants"><strong>Choose option</strong><div class="chips" id="chips">' + p.variants.map(function (v) { return '<button type="button" class="chip' + (v.stock <= 0 ? ' off' : '') + '" data-vid="' + esc(v.id) + '">' + esc(DM.variantLabel(v)) + '</button>'; }).join('') + '</div></div>' : '') +
      '<div class="buy-row"><input type="number" id="qty" value="1" min="1" max="99" data-stepper aria-label="Quantity"><button class="btn btn-primary" id="addBtn">Add to cart</button><button class="btn btn-outline wish-btn" data-wish="' + esc(p.id) + '">♡ Wishlist</button></div>' +
      '<div id="msg"></div><div class="desc"><h3>Details</h3><p>' + esc(p.description || '').replace(/\n/g, '<br>') + '</p>' +
      (p.prescriptionRequired ? '<div class="alert alert-info">' + esc(st.settings.medicineNotice || 'Prescription medicine: delivered after pharmacist confirmation.') + '</div>' : '') + '</div></div></div>';
    DM.rendered();
    var qty = document.getElementById('qty'), addBtn = document.getElementById('addBtn');
    function show() {
      var price = chosen ? chosen.price : p.price, old = chosen ? chosen.oldPrice : p.oldPrice, stock = chosen ? chosen.stock : p.stock;
      document.getElementById('priceBox').innerHTML = (hasV && !chosen ? '<small class="muted">From </small>' : '') + '<strong>' + DM.money(price) + '</strong>' + (old && old > price ? ' <s class="muted small">' + DM.money(old) + '</s> <span class="badge badge-sale">' + DM.pct(price, old) + '% off</span>' : '');
      document.getElementById('stockBox').innerHTML = hasV && !chosen ? '<span class="muted">Select an option</span>' : (stock > 0 ? '<span class="badge badge-ok">In stock' + (stock <= 10 ? ' (' + stock + ' left)' : '') + '</span>' : '<span class="badge badge-out">Out of stock</span>');
      qty.max = Math.max(1, Math.min(99, stock || 1));
      addBtn.disabled = hasV ? (!chosen || chosen.stock <= 0) : p.stock <= 0;
      addBtn.textContent = (hasV ? (!chosen ? 'Select an option' : chosen.stock <= 0 ? 'Out of stock' : 'Add to cart') : (p.stock <= 0 ? 'Out of stock' : 'Add to cart'));
    }
    show();
    var chips = document.getElementById('chips');
    if (chips) chips.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vid]'); if (!b) return; chosen = DM.variant(p, b.dataset.vid);
      chips.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); }); show();
    });
    box.querySelectorAll('[data-img]').forEach(function (t) { t.addEventListener('click', function () { document.getElementById('mainPic').src = t.dataset.img; box.querySelectorAll('[data-img]').forEach(function (x) { x.classList.toggle('on', x === t); }); }); });
    addBtn.addEventListener('click', function () {
      var want = Math.max(1, parseInt(qty.value, 10) || 1), vid = chosen ? chosen.id : '', stock = chosen ? chosen.stock : p.stock;
      var inCart = DM.cart.get().filter(function (l) { return l.id === p.id && (l.vid || '') === vid; }).reduce(function (s, l) { return s + l.qty; }, 0);
      if (inCart + want > stock) { DM.toast('Only ' + stock + ' available' + (inCart ? ' (' + inCart + ' already in your cart)' : ''), 'info'); return; }
      DM.cart.add(p.id, vid, want); DM.toast('Added to cart');
      document.getElementById('msg').innerHTML = '<div class="alert alert-success">Added to cart. <a href="/cart.html">View cart</a></div>';
    });
    // related products: same category
    DM.api('GET', '/products?limit=9&cat=' + encodeURIComponent(p.categoryId)).then(function (r) {
      var rel = r.items.filter(function (x) { return x.id !== p.id; }).slice(0, 4);
      if (rel.length) { document.getElementById('related').innerHTML = '<h2 class="section-title">Related products</h2><div class="product-grid">' + DM.grid(rel, st.settings.labelRules) + '</div>'; DM.rendered(); }
    }).catch(function () {});
  }).catch(function (e) { box.innerHTML = '<div class="empty"><h2>Product not found</h2><p class="muted">' + esc(e.message) + '</p><a class="btn btn-primary" href="/products.html">Back to shop</a></div>'; });
});
