/* =====================================================================
   DaffoMart  -  app.js   (plain JavaScript, no libraries)
   Screen code shared by ALL shop pages. It replaces main.js + header.php + footer.php + the cart
   functions of the PHP version.
    1. Small helpers (toast, flash messages, error box)
    2. Cart, coupon and wishlist (saved in the browser: localStorage)
    3. Product card / picture HTML
    4. Header and footer (put into <div id="site-header"> and <div id="site-footer">)
    5. Dark / light theme, mobile menu, back-to-top button
    6. Live search suggestions
    7. Form validation, quantity + / - buttons
   ===================================================================== */
(function () {
  var DM = window.DM;
  var esc = DM.esc;
  var cfg = DM.cfg;
  var store = cfg.store;

  /* ---------- 1. Helpers ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  // small message that appears at the bottom and disappears after 3 seconds
  var toastBox = null;
  DM.toast = function (message, type) {
    if (!toastBox) {
      toastBox = el('div', 'toasts');
      toastBox.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastBox);
    }
    var t = el('div', 'toast toast-' + (type || 'success'), message);
    toastBox.appendChild(t);
    setTimeout(function () { t.classList.add('hide'); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  };

  // alert box as HTML text:  DM.alertHtml('error', 'Something is wrong')
  DM.alertHtml = function (type, message) {
    return '<div class="alert alert-' + esc(type) + '">' + esc(message) + '</div>';
  };

  // one-time message shown on the NEXT page (like flash() in PHP)
  DM.flash = function (type, message) {
    try { sessionStorage.setItem('dm_flash', JSON.stringify({ type: type, message: message })); } catch (e) { /* ignore */ }
  };
  function showFlash() {
    var main = document.getElementById('main');
    var raw = null;
    try { raw = sessionStorage.getItem('dm_flash'); sessionStorage.removeItem('dm_flash'); } catch (e) { /* ignore */ }
    if (!raw || !main) { return; }
    var f = JSON.parse(raw);
    var box = el('div', 'alert alert-' + f.type, f.message);
    main.insertBefore(box, main.firstChild);
    setTimeout(function () { box.style.opacity = '0'; setTimeout(function () { box.remove(); }, 400); }, 4000);
  }

  // show an error inside a container (used when Firebase cannot be reached)
  DM.fail = function (container, err) {
    console.error(err);
    var hint = DM.db.demo ? '' : ' Check your Firebase config and Firestore rules (see README).';
    container.innerHTML = DM.alertHtml('error', DM.db.errorText(err) + hint);
  };

  // go to another page of the site; only simple file names like "account.html" are allowed
  DM.safeNext = function (next, fallback) {
    return /^[a-z0-9-]+\.html(\?[\w=&.%-]*)?$/i.test(next || '') ? next : fallback;
  };

  /* ---------- 2. Cart, coupon, wishlist (localStorage) ---------- */

  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: ignore */ }
  }

  // cart = { "fresh-tomato": 2, "apple": 1 }   (product slug -> quantity)
  DM.cart = {
    get: function () { var c = load('dm_cart', {}); return (c && typeof c === 'object' && !Array.isArray(c)) ? c : {}; },
    save: function (c) { save('dm_cart', c); DM.refreshCount(); },
    count: function () { var c = DM.cart.get(); return Object.keys(c).reduce(function (s, k) { return s + (Number(c[k]) || 0); }, 0); },
    clear: function () { save('dm_cart', {}); DM.coupon.set(''); DM.refreshCount(); }
  };
  DM.coupon = {
    get: function () { return load('dm_coupon', ''); },
    set: function (code) { save('dm_coupon', code || ''); }
  };

  DM.refreshCount = function () {
    var n = DM.cart.count();
    document.querySelectorAll('.cart-count').forEach(function (box) { box.textContent = n; });
  };

  function findProduct(catalog, slug) {
    for (var i = 0; i < catalog.products.length; i++) { if (catalog.products[i].id === slug) { return catalog.products[i]; } }
    return null;
  }
  DM.findProduct = findProduct;

  // Add a product. Shows a toast with the result.
  DM.addToCart = async function (slug, qty) {
    try {
      var catalog = await DM.db.getCatalog();
      var p = findProduct(catalog, slug);
      if (!p) { DM.toast('Product not found.', 'info'); return; }
      if (p.stock <= 0) { DM.toast(p.name + ' is out of stock.', 'info'); return; }
      var cart = DM.cart.get();
      var want = (Number(cart[slug]) || 0) + Math.max(1, qty || 1);
      if (want > p.stock) {
        cart[slug] = p.stock;
        DM.cart.save(cart);
        DM.toast('Only ' + p.stock + ' of ' + p.name + ' available. Cart updated.', 'info');
        return;
      }
      cart[slug] = want;
      DM.cart.save(cart);
      DM.toast('Added to cart.');
    } catch (e) {
      DM.toast(DM.db.errorText(e), 'info');
    }
  };

  // Cart lines with fresh prices from the database (never trust prices saved in the browser)
  DM.cartLines = async function () {
    var catalog = await DM.db.getCatalog();
    var cart = DM.cart.get();
    var lines = [];
    var subtotal = 0;
    Object.keys(cart).forEach(function (slug) {
      var p = findProduct(catalog, slug);
      if (!p) { return; }
      var qty = Math.min(Number(cart[slug]) || 0, Math.max(0, p.stock));
      if (qty < 1) { return; }
      var total = qty * p.price;
      subtotal += total;
      lines.push({ product: p, qty: qty, total: total });
    });
    return { lines: lines, subtotal: subtotal };
  };

  // The coupon saved in the browser, checked again. Returns { coupon, note }.
  DM.activeCoupon = async function (subtotal) {
    var code = DM.coupon.get();
    if (!code) { return { coupon: null, note: '' }; }
    var c = await DM.db.getCoupon(code);
    var why = DM.couponProblem(c, subtotal);
    if (why) {
      DM.coupon.set('');
      return { coupon: null, note: 'Coupon removed: ' + why };
    }
    return { coupon: c, note: '' };
  };

  /* wishlist = ["fresh-tomato", "apple"] */
  DM.wish = {
    get: function () { var l = load('dm_wishlist', []); return Array.isArray(l) ? l.filter(function (s) { return typeof s === 'string'; }) : []; },
    save: function (l) { save('dm_wishlist', l); DM.refreshWish(); }
  };
  DM.refreshWish = function () {
    var list = DM.wish.get();
    document.querySelectorAll('.wish-count').forEach(function (box) { box.textContent = list.length; });
    document.querySelectorAll('[data-wish]').forEach(function (btn) {
      var on = list.indexOf(btn.dataset.wish) !== -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('on', on);
      if (btn.classList.contains('wish-btn')) {
        btn.textContent = on ? '♥ In wishlist' : '♡ Wishlist';
      } else {
        btn.textContent = on ? '♥' : '♡';
        btn.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Add to wishlist');
      }
    });
  };

  // ONE click handler for all heart buttons and "Add to cart" buttons (also the ones created later by JavaScript)
  document.addEventListener('click', function (event) {
    var heart = event.target.closest('[data-wish]');
    if (heart) {
      event.preventDefault();
      var slug = heart.dataset.wish;
      var list = DM.wish.get();
      var pos = list.indexOf(slug);
      if (pos === -1) { list.push(slug); DM.toast('Saved to wishlist ♥'); } else { list.splice(pos, 1); DM.toast('Removed from wishlist', 'info'); }
      DM.wish.save(list);
      document.dispatchEvent(new CustomEvent('dm:wishchange'));
      return;
    }
    var add = event.target.closest('[data-add]');
    if (add) {
      event.preventDefault();
      var qtyBox = add.dataset.qtyInput ? document.getElementById(add.dataset.qtyInput) : null;
      var qty = qtyBox ? Math.max(1, parseInt(qtyBox.value, 10) || 1) : 1;
      add.disabled = true;
      DM.addToCart(add.dataset.add, qty).then(function () { add.disabled = false; });
    }
  });

  /* ---------- 3. Product card and picture ---------- */

  DM.productPic = function (p) {
    if (p.image) { return '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">'; }
    return '<span class="emoji" role="img" aria-label="' + esc(p.name) + '">' + esc(p.emoji || '🛒') + '</span>';
  };

  DM.productUrl = function (p) { return 'product.html?slug=' + encodeURIComponent(p.id); };

  DM.productCard = function (p) {
    var out = p.stock <= 0;
    var sale = p.oldPrice && p.oldPrice > p.price;
    var link = esc(DM.productUrl(p));
    return '<article class="card product-card">' +
      '<div class="pic">' +
        '<a href="' + link + '" tabindex="-1" aria-hidden="true">' + DM.productPic(p) + '</a>' +
        '<button type="button" class="wish" data-wish="' + esc(p.id) + '" aria-pressed="false" aria-label="Add to wishlist">♡</button>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="badges">' +
          (p.isRx ? '<span class="badge badge-rx">Rx</span>' : '') +
          (sale ? '<span class="badge badge-sale">' + Math.round((p.oldPrice - p.price) / p.oldPrice * 100) + '% off</span>' : '') +
        '</div>' +
        '<h3><a href="' + link + '">' + esc(p.name) + '</a></h3>' +
        '<p class="muted small">' + esc(p.unit) + '</p>' +
        '<p class="price"><strong>' + DM.money(p.price) + '</strong>' + (sale ? '<s class="muted small">' + DM.money(p.oldPrice) + '</s>' : '') + '</p>' +
        (out ? '<button class="btn btn-disabled" disabled>Out of stock</button>'
             : '<button type="button" class="btn btn-primary btn-block" data-add="' + esc(p.id) + '">Add to cart</button>') +
      '</div>' +
    '</article>';
  };

  /* ---------- 4. Header and footer ---------- */

  var headerHtml =
    (DM.db.demo ? '<div class="demo-note">DEMO MODE: Firebase is not connected yet. Data is saved only in this browser. See README.</div>' : '') +
    '<a class="skip-link" href="#main">Skip to content</a>' +
    '<div class="topbar">Everyday essentials, delivered with care &middot; Cash on delivery available</div>' +
    '<header class="site-header"><div class="container nav">' +
      '<a class="brand" href="index.html"><img src="' + esc(DM.assets) + 'img/logo.png" alt="' + esc(store.name) + ' logo"></a>' +
      '<form class="search" role="search" method="get" action="products.html">' +
        '<input type="search" name="q" id="searchInput" placeholder="Search groceries or medicine..." autocomplete="off" value="' + esc(DM.param('q')) + '" aria-label="Search products">' +
        '<button type="submit">Search</button>' +
        '<ul class="suggest" id="suggest" hidden></ul>' +
      '</form>' +
      '<button class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false">&#9776;</button>' +
      '<nav class="nav-links" id="navLinks" aria-label="Main menu">' +
        '<a href="index.html">Home</a>' +
        '<a href="products.html">Shop</a>' +
        '<a href="products.html?kind=medicine">Medicine</a>' +
        '<a href="track.html">Track order</a>' +
        '<a href="contact.html">Contact</a>' +
        '<span id="navAuth"><a href="login.html">Login</a></span>' +
        '<a href="wishlist.html" aria-label="Wishlist">♡ <span class="wish-count">0</span></a>' +
        '<button type="button" class="icon-btn" id="themeToggle" aria-label="Switch dark / light mode">🌙</button>' +
        '<a class="cart-link" href="cart.html">Cart <span class="cart-count">0</span></a>' +
      '</nav>' +
    '</div></header>';

  var footerHtml =
    '<footer class="site-footer">' +
      '<div class="container footer-grid">' +
        '<div><h4>' + esc(store.name) + '</h4><p>' + esc(store.tagline) + '</p></div>' +
        '<div><h4>Quick links</h4><ul>' +
          '<li><a href="products.html">Shop</a></li>' +
          '<li><a href="products.html?kind=medicine">Medicine</a></li>' +
          '<li><a href="track.html">Track order</a></li>' +
          '<li><a href="wishlist.html">Wishlist</a></li>' +
          '<li><a href="contact.html">Contact &amp; delivery</a></li>' +
          '<li><a href="policy.html">Policies</a></li>' +
          '<li><a href="join.html">Join as a rider</a></li>' +
        '</ul></div>' +
        '<div><h4>Contact</h4><p>' + esc(store.address) + '</p><p>' + esc(store.phone) + '</p><p>' + esc(store.email) + '</p></div>' +
      '</div>' +
      '<div class="copyright">&copy; ' + new Date().getFullYear() + ' ' + esc(store.name) + '. University web application project.</div>' +
    '</footer>';

  var headBox = document.getElementById('site-header');
  var footBox = document.getElementById('site-footer');
  if (headBox) { headBox.innerHTML = headerHtml; }
  if (footBox) { footBox.innerHTML = footerHtml; }

  // Login / My orders / Logout: shown when Firebase tells us who is logged in
  DM.db.onAuth(function (user) {
    var box = document.getElementById('navAuth');
    if (!box) { return; }
    box.innerHTML = user
      ? '<a href="account.html">My orders</a> <a href="#" id="logoutLink" style="margin-left:1rem">Logout</a>'
      : '<a href="login.html">Login</a>';
    var out = document.getElementById('logoutLink');
    if (out) {
      out.addEventListener('click', async function (event) {
        event.preventDefault();
        await DM.db.logout();
        DM.flash('success', 'You are logged out.');
        location.href = 'index.html';
      });
    }
  });

  // data-cfg="store.phone" -> text from config.js ;  data-money="delivery.inside" -> money from config.js
  DM.fillCfg = function (root) {
    function dig(path) { return path.split('.').reduce(function (o, k) { return o ? o[k] : ''; }, cfg); }
    (root || document).querySelectorAll('[data-cfg]').forEach(function (n) { n.textContent = dig(n.dataset.cfg); });
    (root || document).querySelectorAll('[data-money]').forEach(function (n) { n.textContent = DM.money(dig(n.dataset.money)); });
  };

  /* ---------- 5. Theme, mobile menu, back-to-top ---------- */

  var themeBtn = document.getElementById('themeToggle');
  function showThemeIcon() {
    if (themeBtn) { themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'; }
  }
  if (themeBtn) {
    showThemeIcon();
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('dm_theme', next); } catch (err) { /* ignore */ }
      showThemeIcon();
    });
  }

  var toggle = document.getElementById('menuToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var topBtn = el('button', 'back-top', '↑');
  topBtn.type = 'button';
  topBtn.setAttribute('aria-label', 'Back to top');
  topBtn.hidden = true;
  document.body.appendChild(topBtn);
  window.addEventListener('scroll', function () { topBtn.hidden = window.scrollY < 600; }, { passive: true });
  topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- 6. Live search suggestions (searches the catalog in the browser) ---------- */

  var searchForm = document.querySelector('form.search');
  var searchInput = document.getElementById('searchInput');
  var suggestBox = document.getElementById('suggest');
  if (searchForm && searchInput && suggestBox) {
    var timer = null;
    var requestId = 0;
    var hideSuggest = function () { suggestBox.hidden = true; suggestBox.innerHTML = ''; };

    searchInput.addEventListener('input', function () {
      clearTimeout(timer);
      var q = searchInput.value.trim().toLowerCase();
      if (q.length < 2) { hideSuggest(); return; }
      timer = setTimeout(async function () {
        var mine = ++requestId;
        try {
          var catalog = await DM.db.getCatalog();
          if (mine !== requestId) { return; }               // ignore answers that arrive late
          var items = catalog.products.filter(function (p) {
            return p.name.toLowerCase().indexOf(q) !== -1 || String(p.genericName || '').toLowerCase().indexOf(q) !== -1;
          }).slice(0, 6);
          suggestBox.innerHTML = items.length ? items.map(function (p) {
            return '<li><a href="' + esc(DM.productUrl(p)) + '">' +
              '<span class="suggest-pic">' + (p.image ? '<img src="' + esc(p.image) + '" alt="">' : esc(p.emoji || '🛒')) + '</span>' +
              '<span class="suggest-text"><strong>' + esc(p.name) + '</strong><small>' + esc(p.unit) + '</small></span>' +
              '<span class="suggest-price">' + DM.money(p.price) + '</span></a></li>';
          }).join('') : '<li class="suggest-empty">No products found</li>';
          suggestBox.hidden = false;
        } catch (e) { hideSuggest(); }
      }, 200);
    });

    // keyboard: arrow keys move through the suggestions, Escape closes them
    searchForm.addEventListener('keydown', function (event) {
      var anchors = Array.prototype.slice.call(suggestBox.querySelectorAll('a'));
      var index = anchors.indexOf(document.activeElement);
      if (event.key === 'Escape') { hideSuggest(); searchInput.focus(); }
      if (event.key === 'ArrowDown' && anchors.length) { event.preventDefault(); anchors[Math.min(index + 1, anchors.length - 1)].focus(); }
      if (event.key === 'ArrowUp' && anchors.length) {
        event.preventDefault();
        if (index <= 0) { searchInput.focus(); } else { anchors[index - 1].focus(); }
      }
    });
    document.addEventListener('click', function (event) { if (!searchForm.contains(event.target)) { hideSuggest(); } });
  }

  /* ---------- 7. Form validation and quantity buttons ---------- */

  // One rule per input name. Returns an error text, or '' when the value is fine.
  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your full name.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.'; },
    phone: function (v) { return DM.isPhone(v) ? '' : 'Enter a valid mobile number, e.g. 01712345678.'; },
    address: function (v) { return v.trim().length >= 10 ? '' : 'Please write your full address (at least 10 characters).'; },
    area: function (v) { return v.trim().length >= 2 ? '' : 'Please enter the area.'; },
    order_no: function (v) { return v.trim() !== '' ? '' : 'Please enter the order number.'; }
  };

  function clearError(input) {
    input.classList.remove('field-error');
    var next = input.nextElementSibling;
    if (next && next.classList.contains('error-text')) { next.remove(); }
  }
  function showError(input, message) {
    clearError(input);
    if (message === '') { return; }
    input.classList.add('field-error');
    input.insertAdjacentElement('afterend', el('span', 'error-text', message));
  }
  function skip(input) {
    return input.type === 'hidden' || input.type === 'radio' || input.type === 'checkbox' || input.name === 'note' || input.name === 'message';
  }
  function validateInput(form, input) {
    var value = input.value;
    var message = '';
    if (input.name === 'password') {
      message = form.id === 'registerForm'
        ? (value.length >= 6 ? '' : 'Password must be at least 6 characters.')
        : (value !== '' ? '' : 'Please enter your password.');
    } else if (input.name === 'confirm') {
      var pass = form.querySelector('[name="password"]');
      message = pass && value === pass.value ? '' : 'Passwords do not match.';
    } else if (rules[input.name]) {
      message = rules[input.name](value);
    }
    showError(input, message);
    return message === '';
  }

  // Checks every field; focuses the first wrong one. Returns true when the form is fine.
  DM.validateForm = function (form) {
    var firstBad = null;
    form.querySelectorAll('input[name], textarea[name]').forEach(function (input) {
      if (skip(input)) { return; }
      if (!validateInput(form, input) && !firstBad) { firstBad = input; }
    });
    if (firstBad) { firstBad.focus(); }
    return !firstBad;
  };

  // forms with the "novalidate" attribute check a field when the user leaves it
  document.querySelectorAll('form[novalidate]').forEach(function (form) {
    form.querySelectorAll('input[name], textarea[name]').forEach(function (input) {
      if (skip(input)) { return; }
      input.addEventListener('blur', function () { if (input.value !== '') { validateInput(form, input); } });
      input.addEventListener('input', function () { clearError(input); });
    });
  });

  // + / - buttons around <input type="number" data-stepper>   (call again after drawing new HTML)
  DM.initSteppers = function (root) {
    (root || document).querySelectorAll('input[type="number"][data-stepper]').forEach(function (input) {
      if (input.dataset.stepped) { return; }
      input.dataset.stepped = '1';
      var wrap = el('span', 'stepper');
      var minus = el('button', 'step-btn', '−');
      var plus = el('button', 'step-btn', '+');
      minus.type = 'button';
      plus.type = 'button';
      minus.setAttribute('aria-label', 'Decrease quantity');
      plus.setAttribute('aria-label', 'Increase quantity');
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(minus);
      wrap.appendChild(input);
      wrap.appendChild(plus);
      var change = function (delta) {
        var min = input.min !== '' ? Number(input.min) : 0;
        var max = input.max !== '' ? Number(input.max) : 99;
        input.value = Math.max(min, Math.min(max, (Number(input.value) || 0) + delta));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      minus.addEventListener('click', function () { change(-1); });
      plus.addEventListener('click', function () { change(1); });
    });
  };

  /* ---------- start ---------- */
  DM.refreshCount();
  DM.refreshWish();
  DM.fillCfg();
  DM.initSteppers();
  showFlash();
  document.addEventListener('dm:rendered', function () { DM.refreshWish(); DM.fillCfg(); DM.initSteppers(); });
})();
