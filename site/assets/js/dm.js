/* =====================================================================
   DaffoMart - dm.js   (plain JavaScript, no libraries)
   Shared code of ALL shop pages. Parts:
    1. Helpers (escape, money, dates, toast)       4. Product card + variants
    2. api()  - talks to the PHP API               5. Header, footer, theme, search
    3. Cart, wishlist, coupon (browser storage)    6. Page start
   Every page loads: config.js -> dm.js -> pages/<page>.js
   ===================================================================== */
(function () {
  var DM = window.DM = { cfg: window.DM_CONFIG };

  /* ---------- 1. Helpers ---------- */
  // escape text before putting it into HTML (stops XSS) - use for EVERY value that came from users or the database
  DM.esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var esc = DM.esc;
  DM.money = function (n) { n = Number(n) || 0; return '৳' + n.toLocaleString('en-US', { minimumFractionDigits: Math.floor(n) === n ? 0 : 2, maximumFractionDigits: 2 }); };
  DM.param = function (k) { return new URLSearchParams(location.search).get(k) || ''; };
  DM.fmtDate = function (iso, time) {
    if (!iso) return '-';
    var o = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' };
    if (time) { o.hour = '2-digit'; o.minute = '2-digit'; o.hour12 = true; }
    return new Date(iso).toLocaleString('en-GB', o);
  };
  DM.isPhone = function (v) { return /^01[3-9][0-9]{8}$/.test(String(v || '').trim()); };
  DM.normPhone = function (v) { var d = String(v || '').replace(/\D/g, ''); if (d.indexOf('880') === 0) d = d.slice(2); if (d.length === 10 && d[0] === '1') d = '0' + d; return d; };
  DM.pct = function (price, old) { return old && old > price ? Math.round((old - price) / old * 100) : 0; };
  DM.STATUS = { pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', assigned: 'Rider assigned', picked_up: 'Picked up', on_the_way: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' };
  DM.statusBadge = function (s) { return '<span class="status status-' + esc(s) + '">' + esc(DM.STATUS[s] || s) + '</span>'; };

  var toastBox;
  DM.toast = function (msg, type) {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('aria-live', 'polite'); document.body.appendChild(toastBox); }
    var t = document.createElement('div'); t.className = 'toast toast-' + (type || 'success'); t.textContent = msg; toastBox.appendChild(t);
    setTimeout(function () { t.classList.add('hide'); }, 2600); setTimeout(function () { t.remove(); }, 3100);
  };
  DM.alertHtml = function (type, msg) { return '<div class="alert alert-' + esc(type) + '">' + esc(msg) + '</div>'; };
  DM.fail = function (box, err) { console.error(err); box.innerHTML = DM.alertHtml('error', err && err.message ? err.message : 'Something went wrong'); };
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  DM.load = load; DM.save = save;

  /* ---------- 2. API ---------- */
  // DM.api('GET', '/products?limit=5')  -> the "data" part of the answer, or throws Error(message)
  DM.TOKEN_KEY = 'dm_admin_token';
  DM.api = function (method, path, body, isForm) {
    var base = String(DM.cfg.API_BASE || '').replace(/\/$/, '');
    if (base.indexOf('?r=') !== -1 && path.indexOf('?') !== -1) path = path.replace('?', '&');
    var headers = {}; var token = null;
    try { token = localStorage.getItem(DM.TOKEN_KEY); } catch (e) { /* ignore */ }
    if (token) headers['Authorization'] = 'Bearer ' + token;
    var opt = { method: method, headers: headers };
    if (body !== undefined && body !== null) { if (isForm) opt.body = body; else { headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); } }
    return fetch(base + path, opt).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'The server sent an unexpected answer' }; }).then(function (j) {
      if (!j.ok) { var e = new Error(j.error || 'Request failed'); e.status = r.status; e.details = j.details; throw e; }
      return j.data;
    }); }, function () { throw new Error('Cannot reach the server. Check your internet or the API address in config.js.'); });
  };

  // settings, categories, banners, offers, delivery areas and payment options: one request, cached for the page
  var storePromise;
  DM.store = function () { if (!storePromise) storePromise = DM.api('GET', '/store'); return storePromise; };

  /* ---------- 3. Cart, wishlist, coupon ---------- */
  // cart = [ {id, vid, qty} ]   vid = chosen variant (size/colour) or ''
  DM.cart = {
    get: function () { var c = load('dm_cart2', []); return Array.isArray(c) ? c.filter(function (l) { return l && l.id && l.qty > 0; }) : []; },
    save: function (c) { save('dm_cart2', c); DM.refreshCount(); },
    count: function () { return DM.cart.get().reduce(function (s, l) { return s + l.qty; }, 0); },
    clear: function () { save('dm_cart2', []); save('dm_coupon', ''); DM.refreshCount(); },
    add: function (id, vid, qty) {
      var c = DM.cart.get(), line = c.filter(function (l) { return l.id === id && (l.vid || '') === (vid || ''); })[0];
      if (line) line.qty += qty; else c.push({ id: id, vid: vid || '', qty: qty });
      DM.cart.save(c);
    }
  };
  DM.coupon = { get: function () { return load('dm_coupon', ''); }, set: function (c) { save('dm_coupon', c || ''); } };
  DM.wish = { get: function () { var l = load('dm_wishlist', []); return Array.isArray(l) ? l : []; }, save: function (l) { save('dm_wishlist', l); DM.refreshWish(); } };
  DM.refreshCount = function () { var n = DM.cart.count(); document.querySelectorAll('.cart-count').forEach(function (b) { b.textContent = n; }); };
  DM.refreshWish = function () {
    var l = DM.wish.get();
    document.querySelectorAll('.wish-count').forEach(function (b) { b.textContent = l.length; });
    document.querySelectorAll('[data-wish]').forEach(function (b) { var on = l.indexOf(b.dataset.wish) !== -1; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.textContent = b.classList.contains('wish-btn') ? (on ? '♥ In wishlist' : '♡ Wishlist') : (on ? '♥' : '♡'); });
  };
  DM.lastOrder = { get: function () { return load('dm_last_order', null); }, set: function (o) { save('dm_last_order', o); } };

  // ONE click handler for all heart buttons and quick "Add to cart" buttons (also those created later)
  document.addEventListener('click', function (e) {
    var h = e.target.closest('[data-wish]');
    if (h) { e.preventDefault(); var l = DM.wish.get(), i = l.indexOf(h.dataset.wish); if (i < 0) { l.push(h.dataset.wish); DM.toast('Saved to wishlist ♥'); } else { l.splice(i, 1); DM.toast('Removed from wishlist', 'info'); } DM.wish.save(l); document.dispatchEvent(new CustomEvent('dm:wishchange')); return; }
    var a = e.target.closest('[data-add]');
    if (a) { e.preventDefault(); DM.quickAdd(a.dataset.add, a); }
  });
  DM.quickAdd = function (id, btn) {
    if (btn) btn.disabled = true;
    return DM.api('GET', '/products/' + encodeURIComponent(id)).then(function (p) {
      if (p.variants && p.variants.length) { location.href = DM.productUrl(p); return; }
      if (p.stock <= 0) { DM.toast(p.name + ' is out of stock', 'info'); return; }
      var inCart = DM.cart.get().filter(function (l) { return l.id === p.id; }).reduce(function (s, l) { return s + l.qty; }, 0);
      if (inCart + 1 > p.stock) { DM.toast('Only ' + p.stock + ' of ' + p.name + ' available', 'info'); return; }
      DM.cart.add(p.id, '', 1); DM.toast('Added to cart');
    }).catch(function (e) { DM.toast(e.message, 'info'); }).then(function () { if (btn) btn.disabled = false; });
  };
  // cart lines joined with FRESH product data (prices/stock are never trusted from the browser)
  DM.cartLines = function () {
    var cart = DM.cart.get(); if (!cart.length) return Promise.resolve({ lines: [], subtotal: 0 });
    var ids = cart.map(function (l) { return l.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    return DM.api('GET', '/products?limit=100&ids=' + ids.join(',')).then(function (r) {
      var map = {}; r.items.forEach(function (p) { map[p.id] = p; });
      var lines = [], subtotal = 0;
      cart.forEach(function (l) {
        var p = map[l.id]; if (!p) return;
        var v = DM.variant(p, l.vid); if (p.variants && p.variants.length && !v) return;
        var price = v ? v.price : p.price, stock = v ? v.stock : p.stock, qty = Math.min(l.qty, Math.max(0, stock));
        if (qty < 1) return;
        lines.push({ product: p, variant: v, vid: l.vid || '', qty: qty, price: price, total: qty * price, stock: stock }); subtotal += qty * price;
      });
      return { lines: lines, subtotal: subtotal };
    });
  };

  /* ---------- 4. Product card + variants ---------- */
  DM.variant = function (p, vid) { if (!vid || !p.variants) return null; return p.variants.filter(function (v) { return v.id === vid; })[0] || null; };
  DM.variantLabel = function (v) { return [v.size, v.weight, v.color].filter(Boolean).join(' / '); };
  DM.productUrl = function (p) { return '/product.html?slug=' + encodeURIComponent(p.slug || p.id); };
  DM.pic = function (p) { var img = p.image || (p.images && p.images[0]); return img ? '<img src="' + esc(img) + '" alt="' + esc(p.name) + '" loading="lazy">' : '<span class="emoji" role="img" aria-label="' + esc(p.name) + '">' + esc(p.emoji || '🛒') + '</span>'; };
  DM.labelsFor = function (p, rules) {   // "Best seller", "New", "Offer" badges (rules come from admin settings)
    rules = rules || {}; var out = [];
    var pct = DM.pct(p.price, p.oldPrice);
    if (pct && rules.showOffer !== false) out.push('<span class="badge badge-sale">' + pct + '% off</span>');
    if (rules.showBestSeller !== false && (p.sold || 0) >= (rules.bestSellerMinSold || 5)) out.push('<span class="badge badge-ok">Best seller</span>');
    if (rules.showNewArrival !== false && p.createdAt && Date.now() - new Date(p.createdAt).getTime() < (rules.newArrivalDays || 14) * 864e5) out.push('<span class="badge badge-new">New</span>');
    if (p.prescriptionRequired) out.push('<span class="badge badge-rx">Rx</span>');
    if (p.stock <= 0 && rules.showOutOfStock !== false) out.push('<span class="badge badge-out">Out of stock</span>');
    return out.join('');
  };
  DM.productCard = function (p, rules) {
    var out = p.stock <= 0, sale = p.oldPrice && p.oldPrice > p.price, hasV = p.variants && p.variants.length, link = esc(DM.productUrl(p));
    return '<article class="card product-card"><div class="pic"><a href="' + link + '" tabindex="-1" aria-hidden="true">' + DM.pic(p) + '</a>' +
      '<button type="button" class="wish" data-wish="' + esc(p.id) + '" aria-pressed="false" aria-label="Add to wishlist">♡</button></div>' +
      '<div class="card-body"><div class="badges">' + DM.labelsFor(p, rules) + '</div>' +
      '<h3><a href="' + link + '">' + esc(p.name) + '</a></h3><p class="muted small">' + esc(hasV ? p.variants.length + ' options' : p.unit) + '</p>' +
      '<p class="price"><strong>' + (hasV ? '<small class="muted">From </small>' : '') + DM.money(p.price) + '</strong>' + (sale ? '<s class="muted small">' + DM.money(p.oldPrice) + '</s>' : '') + '</p>' +
      (out ? '<button class="btn btn-disabled btn-block" disabled>Out of stock</button>'
        : hasV ? '<a class="btn btn-outline btn-block" href="' + link + '">Choose option</a>'
        : '<button type="button" class="btn btn-primary btn-block" data-add="' + esc(p.id) + '">Add to cart</button>') + '</div></article>';
  };
  DM.grid = function (list, rules) { return list.map(function (p) { return DM.productCard(p, rules); }).join(''); };
  DM.rendered = function () { DM.refreshWish(); document.dispatchEvent(new Event('dm:rendered')); };

  /* ---------- 5. Header, footer, theme, search ---------- */
  var S = {};  // settings of the shop (filled when the page starts)
  DM.settings = function () { return S; };
  function header() {
    return '<a class="skip-link" href="#main">Skip to content</a>' + (S.announcement ? '<div class="topbar">' + esc(S.announcement) + '</div>' : '') +
      '<header class="site-header"><div class="container nav"><a class="brand" href="/">' + (S.logo ? '<img src="' + esc(S.logo) + '" alt="' + esc(S.storeName) + '">' : '<strong class="brand-text">' + esc(S.storeName || 'DaffoMart') + '</strong>') + '</a>' +
      '<form class="search" role="search" action="/products.html"><input type="search" name="q" id="searchInput" placeholder="Search groceries or medicine..." autocomplete="off" value="' + esc(DM.param('q')) + '" aria-label="Search products"><button type="submit">Search</button><ul class="suggest" id="suggest" hidden></ul></form>' +
      '<button class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false">&#9776;</button>' +
      '<nav class="nav-links" id="navLinks" aria-label="Main menu"><a href="/">Home</a><a href="/products.html">Shop</a>' + (S.showMedicine !== false ? '<a href="/medicine.html">Medicine</a>' : '') +
      '<a href="/orders.html">My orders</a><a href="/track.html">Track order</a><a href="/contact.html">Contact</a>' +
      '<a href="/wishlist.html" aria-label="Wishlist">♡ <span class="wish-count">0</span></a><button type="button" class="icon-btn" id="themeToggle" aria-label="Switch dark / light mode">🌙</button>' +
      '<a class="cart-link" href="/cart.html">Cart <span class="cart-count">0</span></a></nav></div></header>';
  }
  function footer() {
    return '<footer class="site-footer"><div class="container footer-grid"><div><h4>' + esc(S.storeName) + '</h4><p>' + esc(S.footerText || S.tagline) + '</p></div>' +
      '<div><h4>Quick links</h4><ul><li><a href="/products.html">Shop</a></li>' + (S.showMedicine !== false ? '<li><a href="/medicine.html">Medicine</a></li>' : '') +
      '<li><a href="/orders.html">My orders</a></li><li><a href="/track.html">Track order</a></li><li><a href="/wishlist.html">Wishlist</a></li><li><a href="/contact.html">Contact &amp; delivery</a></li><li><a href="/policy.html">Policies</a></li></ul></div>' +
      '<div><h4>Contact</h4><p>' + esc(S.address) + '</p>' + (S.phone ? '<p><a href="tel:' + esc(S.phone) + '">' + esc(S.phone) + '</a></p>' : '') + (S.email ? '<p>' + esc(S.email) + '</p>' : '') + '<p>' + esc(S.hours) + '</p></div></div>' +
      '<div class="copyright">&copy; ' + new Date().getFullYear() + ' ' + esc(S.storeName) + '</div></footer>' +
      (S.whatsapp && S.showSupportWa !== false ? '<a class="float-wa" href="https://wa.me/' + esc(String(S.whatsapp).replace(/\D/g, '')) + '" target="_blank" rel="noopener">💬 ' + esc(S.supportWaLabel || 'WhatsApp') + '</a>' : '');
  }
  function applyTheme() {   // colours chosen by the admin in Settings
    var r = document.documentElement.style;
    if (S.primaryColor) { r.setProperty('--primary', S.primaryColor); r.setProperty('--primary-dark', S.primaryColor); }
    if (S.accentColor) r.setProperty('--accent', S.accentColor);
  }
  function wireHeader() {
    var tb = document.getElementById('themeToggle');
    function icon() { if (tb) tb.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'; }
    if (tb) { icon(); tb.addEventListener('click', function () { var n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('dm_theme', n); } catch (e) { /* ignore */ } icon(); }); }
    var tg = document.getElementById('menuToggle'), nl = document.getElementById('navLinks');
    if (tg) tg.addEventListener('click', function () { tg.setAttribute('aria-expanded', nl.classList.toggle('open')); });
    var f = document.querySelector('form.search'), inp = document.getElementById('searchInput'), box = document.getElementById('suggest'), timer, n = 0;
    if (!f) return;
    function hide() { box.hidden = true; box.innerHTML = ''; }
    inp.addEventListener('input', function () {
      clearTimeout(timer); var q = inp.value.trim(); if (q.length < 2) return hide();
      timer = setTimeout(function () { var me = ++n; DM.api('GET', '/products?limit=6&q=' + encodeURIComponent(q)).then(function (r) {
        if (me !== n) return;
        box.innerHTML = r.items.length ? r.items.map(function (p) { return '<li><a href="' + esc(DM.productUrl(p)) + '"><span class="suggest-pic">' + (p.image ? '<img src="' + esc(p.image) + '" alt="">' : esc(p.emoji || '🛒')) + '</span><span class="suggest-text"><strong>' + esc(p.name) + '</strong><small>' + esc(p.unit) + '</small></span><span class="suggest-price">' + DM.money(p.price) + '</span></a></li>'; }).join('') : '<li class="suggest-empty">No products found</li>';
        box.hidden = false; }).catch(hide); }, 220);
    });
    document.addEventListener('click', function (e) { if (!f.contains(e.target)) hide(); });
  }

  // + / - buttons around <input type="number" data-stepper>
  DM.initSteppers = function (root) {
    (root || document).querySelectorAll('input[type="number"][data-stepper]').forEach(function (input) {
      if (input.dataset.stepped) return; input.dataset.stepped = '1';
      var w = document.createElement('span'); w.className = 'stepper';
      var m = document.createElement('button'), p = document.createElement('button');
      m.type = p.type = 'button'; m.className = p.className = 'step-btn'; m.textContent = '−'; p.textContent = '+'; m.setAttribute('aria-label', 'Decrease'); p.setAttribute('aria-label', 'Increase');
      input.parentNode.insertBefore(w, input); w.appendChild(m); w.appendChild(input); w.appendChild(p);
      function ch(d) { var lo = input.min !== '' ? +input.min : 0, hi = input.max !== '' ? +input.max : 99; input.value = Math.max(lo, Math.min(hi, (+input.value || 0) + d)); input.dispatchEvent(new Event('input', { bubbles: true })); }
      m.addEventListener('click', function () { ch(-1); }); p.addEventListener('click', function () { ch(1); });
    });
  };

  /* ---------- 6. Page start ---------- */
  // Pages call DM.ready(function (store) { ... }) : runs after the shop settings are loaded and header/footer are drawn.
  DM.ready = function (fn) {
    var hb = document.getElementById('site-header'), fb = document.getElementById('site-footer');
    DM.store().then(function (st) {
      S = st.settings || {}; applyTheme();
      if (hb) hb.innerHTML = header(); if (fb) fb.innerHTML = footer();
      if (S.storeName && document.title.indexOf('|') === -1) document.title += ' | ' + S.storeName;
      wireHeader(); DM.refreshCount(); DM.refreshWish(); DM.initSteppers();
      return fn(st);
    }).catch(function (e) { var m = document.getElementById('main'); if (m) DM.fail(m, e); });
  };
  document.addEventListener('dm:rendered', function () { DM.refreshWish(); DM.initSteppers(); });
})();
// only allow safe links (own pages or http/https) in admin-written buttons
DM.safeHref = function (h) { h = String(h || '/'); return (/^(\/|https?:\/\/)/i.test(h) && h.indexOf('//') !== 0) || /^https?:\/\//i.test(h) ? h : '/'; };
