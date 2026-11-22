/* =====================================================================
   DaffoMart - admin.js   (the whole admin panel, plain JavaScript)
   The page address after # chooses the screen:  #/orders  #/products  #/products/new  #/products/<id> ...
   Parts: 1 start + login   2 layout   3 dashboard   4 orders   5 generic list/edit screens (products, categories ...)
          6 customers   7 inventory   8 settings (+ home section order)
   ===================================================================== */
(function () {
  var DM = window.DM, esc = DM.esc, root = document.getElementById('adminRoot'), me = null;
  function $(s, r) { return (r || document).querySelector(s); }
  function view() { return document.getElementById('view'); }
  function go(h) { location.hash = h; }
  function err(e) { DM.toast(e.message || 'Error', 'info'); }
  function val(o, k, d) { return o && o[k] != null ? o[k] : d; }

  /* ---------- 1. start + login ---------- */
  function start() {
    if (!localStorage.getItem(DM.TOKEN_KEY)) return loginScreen();
    DM.api('GET', '/auth/me').then(function (a) { if (!a) { localStorage.removeItem(DM.TOKEN_KEY); return loginScreen(); } me = a; layout(); route(); }).catch(function (e) { loginScreen(e.message); });
  }
  function loginScreen(msg) {
    root.innerHTML = '<div class="admin-login"><h1>DaffoMart Admin</h1><form class="card form-card" id="lf"><label>Email<input name="email" type="email" required autocomplete="username"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label>' +
      (msg ? DM.alertHtml('error', msg) : '') + '<button class="btn btn-primary btn-block">Sign in</button></form></div>';
    $('#lf').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target;
      DM.api('POST', '/auth/login', { email: f.email.value, password: f.password.value }).then(function (r) { localStorage.setItem(DM.TOKEN_KEY, r.token); me = r; layout(); route(); }).catch(function (x) { loginScreen(x.message); });
    });
  }

  /* ---------- 2. layout + router ---------- */
  var NAV = [['dashboard', 'Dashboard'], ['orders', 'Orders'], ['products', 'Products'], ['inventory', 'Inventory'], ['categories', 'Categories'], ['customers', 'Customers'], ['offers', 'Offers & coupons'],
    ['banners', 'Banners'], ['zones', 'Delivery areas'], ['couriers', 'Couriers'], ['payment-methods', 'Payment methods'], ['settings', 'Settings']];
  function layout() {
    root.innerHTML = '<div class="admin-wrap"><aside class="admin-side"><h2>DaffoMart Admin</h2>' + NAV.map(function (n) { return '<a href="#/' + n[0] + '" data-nav="' + n[0] + '">' + n[1] + '</a>'; }).join('') +
      '<a href="/" target="_blank">View shop ↗</a><div class="side-foot">' + esc(me.email) + '<br>' + esc(me.adminRole) + '<br><button class="btn btn-sm btn-light" id="logout">Sign out</button></div></aside><main class="admin-main" id="view"></main></div>';
    $('#logout').addEventListener('click', function () { DM.api('POST', '/auth/logout').catch(function () {}); localStorage.removeItem(DM.TOKEN_KEY); me = null; loginScreen(); });
  }
  window.addEventListener('hashchange', function () { if (me) route(); });
  function route() {
    var parts = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/'), page = parts[0], arg = parts[1];
    document.querySelectorAll('[data-nav]').forEach(function (a) { a.classList.toggle('active', a.dataset.nav === page); });
    view().innerHTML = '<p class="loading">Loading...</p>';
    var p;
    if (page === 'dashboard') p = dashboard();
    else if (page === 'orders') p = arg ? orderDetail(arg) : orders();
    else if (page === 'customers') p = arg ? customerDetail(arg) : customers();
    else if (page === 'inventory') p = inventory();
    else if (page === 'settings') p = settings();
    else if (RES[page]) p = arg ? resForm(page, arg) : resList(page);
    else p = Promise.resolve(view().innerHTML = '<p>Page not found.</p>');
    Promise.resolve(p).catch(function (e) { if (e.status === 401) { localStorage.removeItem(DM.TOKEN_KEY); loginScreen('Session expired. Please sign in again.'); } else view().innerHTML = DM.alertHtml('error', e.message); });
  }
  function head(title, right) { return '<div class="admin-top"><h1>' + esc(title) + '</h1><div>' + (right || '') + '</div></div>'; }

  /* ---------- 3. dashboard ---------- */
  function dashboard() {
    return DM.api('GET', '/admin/stats?days=14').then(function (d) {
      var t = d.totals, max = Math.max.apply(null, d.series.map(function (s) { return s.sales; }).concat([1]));
      view().innerHTML = head('Dashboard') + '<div class="stats">' + [['Sales (live orders)', DM.money(t.sales)], ['Delivered revenue', DM.money(t.revenue)], ['Today', t.todayOrders + ' orders · ' + DM.money(t.todaySales)], ['Pending orders', t.pending], ['Customers', t.customers], ['Avg order', DM.money(t.avgOrder)], ['Products', t.activeProducts + ' / ' + t.products], ['Out of stock', t.outOfStock]].map(function (s) { return '<div class="stat card"><strong>' + s[1] + '</strong><span>' + s[0] + '</span></div>'; }).join('') + '</div>' +
        '<div class="chart-card card"><h3>Sales, last 14 days <small class="muted">(trend ' + (d.trend >= 0 ? '+' : '') + d.trend + '%)</small></h3><div class="bars">' + d.series.map(function (s) { return '<div class="bar-col"><span class="bar-value">' + (s.sales ? DM.money(s.sales) : '') + '</span><div class="bar" style="height:' + Math.round(s.sales / max * 100) + '%"></div><span class="bar-label">' + s.date.slice(8) + '</span></div>'; }).join('') + '</div></div>' +
        '<div class="two-col"><div class="card info-card"><h3>Recent orders</h3><table class="table"><tbody>' + d.recentOrders.map(function (o) { return '<tr><td><a href="#/orders/' + esc(o.id) + '">' + esc(o.orderNo) + '</a></td><td>' + esc(o.name) + '</td><td>' + DM.money(o.total) + '</td><td>' + DM.statusBadge(o.status) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="card info-card"><h3>Low stock</h3><table class="table"><tbody>' + (d.lowStock.map(function (p) { return '<tr><td><a href="#/products/' + esc(p.id) + '">' + esc(p.name) + '</a></td><td>' + p.stock + ' ' + esc(p.unit) + '</td></tr>'; }).join('') || '<tr><td>All good ✔</td></tr>') + '</tbody></table>' +
        '<h3>Top products</h3><table class="table"><tbody>' + d.topProducts.map(function (p) { return '<tr><td>' + esc(p.name) + '</td><td>' + p.qty + ' sold</td><td>' + DM.money(p.revenue) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
    });
  }

  /* ---------- 4. orders ---------- */
  var ordFilter = { status: '', q: '' };
  function orders() {
    return DM.api('GET', '/orders?status=' + encodeURIComponent(ordFilter.status) + '&q=' + encodeURIComponent(ordFilter.q)).then(function (list) {
      view().innerHTML = head('Orders (' + list.length + ')') + '<div class="filter-bar"><a data-st="" class="' + (!ordFilter.status ? 'active' : '') + '">All</a>' + Object.keys(DM.STATUS).map(function (s) { return '<a data-st="' + s + '" class="' + (ordFilter.status === s ? 'active' : '') + '">' + DM.STATUS[s] + '</a>'; }).join('') + '</div>' +
        '<form id="oq" class="coupon-form"><input name="q" placeholder="Search order no, name, phone" value="' + esc(ordFilter.q) + '"><button class="btn btn-outline btn-sm">Search</button></form>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Customer</th><th>Area</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead><tbody>' + (list.map(function (o) {
          return '<tr><td><a href="#/orders/' + esc(o.id) + '"><strong>' + esc(o.orderNo) + '</strong></a></td><td>' + esc(o.name) + '<br><small class="muted">' + esc(o.phone) + '</small></td><td>' + esc(o.zoneName) + '</td><td>' + DM.money(o.total) + '</td><td>' + esc(o.payment) + '<br><small class="muted">' + esc(o.paymentStatus) + '</small></td><td>' + DM.statusBadge(o.status) + '</td><td>' + DM.fmtDate(o.createdAt, true) + '</td></tr>'; }).join('') || '<tr><td colspan="7" class="muted">No orders.</td></tr>') + '</tbody></table></div>';
      document.querySelectorAll('[data-st]').forEach(function (a) { a.addEventListener('click', function () { ordFilter.status = a.dataset.st; orders(); }); });
      $('#oq').addEventListener('submit', function (e) { e.preventDefault(); ordFilter.q = e.target.q.value.trim(); orders(); });
    });
  }
  function orderDetail(id) {
    return Promise.all([DM.api('GET', '/orders/' + id), DM.api('GET', '/couriers').catch(function () { return []; })]).then(function (r) {
      var o = r[0], couriers = r[1], opt = function (list, cur) { return list.map(function (s) { return '<option value="' + esc(s) + '"' + (s === cur ? ' selected' : '') + '>' + esc(DM.STATUS[s] || s) + '</option>'; }).join(''); };
      view().innerHTML = head('Order ' + o.orderNo, '<a class="btn btn-outline btn-sm" href="#/orders">← Back</a> <button class="btn btn-outline btn-sm" id="printBtn">Print</button>') +
        '<div class="two-col"><div class="card info-card"><h3>Customer</h3><p><strong>' + esc(o.name) + '</strong><br>📞 ' + esc(o.phone) + '<br>📍 ' + esc(o.address) + '<br><small class="muted">' + esc(o.zoneName) + '</small></p>' + (o.note ? '<p>📝 ' + esc(o.note) + '</p>' : '') + '<p class="muted small">Placed ' + DM.fmtDate(o.createdAt, true) + '</p>' +
        (o.hasRx ? '<div class="alert alert-info">Contains prescription (Rx) medicine: confirm the prescription by phone.</div>' : '') + '</div>' +
        '<div class="card info-card"><h3>Update</h3><label>Status<select id="stSel">' + opt(Object.keys(DM.STATUS), o.status) + '</select></label><label>Payment status<select id="pySel">' + ['unpaid', 'pending', 'paid', 'failed', 'refunded'].map(function (s) { return '<option' + (s === o.paymentStatus ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
        '<small class="muted">Payment: ' + esc(o.paymentLabel || o.payment) + (o.paymentRef ? ' · TrxID ' + esc(o.paymentRef) + ' from ' + esc(o.paymentFrom) : '') + '</small>' +
        '<label>Courier (outside Dhaka)<select id="coSel"><option value="">— none —</option>' + couriers.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === o.courierId ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
        '<label>Tracking number<input id="tkInp" value="' + esc(o.trackingNo || '') + '"></label><button class="btn btn-primary" id="saveO">Save changes</button> <button class="btn btn-danger btn-sm" id="delO">Delete order</button></div></div>' +
        '<div class="card" style="margin-top:1rem"><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>' + o.items.map(function (i) { return '<tr><td>' + esc(i.name) + '<br><small class="muted">' + esc(i.unit || '') + '</small></td><td>' + DM.money(i.price) + '</td><td>' + i.qty + '</td><td>' + DM.money(i.price * i.qty) + '</td></tr>'; }).join('') +
        '<tr><td colspan="3">Subtotal</td><td>' + DM.money(o.subtotal) + '</td></tr>' + (o.discount ? '<tr><td colspan="3">Discount ' + esc(o.couponCode || '') + '</td><td>−' + DM.money(o.discount) + '</td></tr>' : '') + '<tr><td colspan="3">Delivery</td><td>' + DM.money(o.delivery) + '</td></tr>' + (o.serviceCharge ? '<tr><td colspan="3">Service charge</td><td>' + DM.money(o.serviceCharge) + '</td></tr>' : '') + '<tr class="total-row"><td colspan="3"><strong>Total</strong></td><td><strong>' + DM.money(o.total) + '</strong></td></tr></tbody></table></div></div>';
      $('#printBtn').addEventListener('click', function () { window.print(); });
      $('#saveO').addEventListener('click', function () {
        var calls = [], b;
        if ($('#stSel').value !== o.status) calls.push({ status: $('#stSel').value });
        if ($('#pySel').value !== o.paymentStatus) calls.push({ paymentStatus: $('#pySel').value });
        if ($('#coSel').value !== (o.courierId || '') || $('#tkInp').value !== (o.trackingNo || '')) calls.push({ courierId: $('#coSel').value, trackingNo: $('#tkInp').value });
        if (!calls.length) return DM.toast('Nothing changed', 'info');
        calls.reduce(function (p, c) { return p.then(function () { return DM.api('PATCH', '/orders/' + id, c); }); }, Promise.resolve()).then(function () { DM.toast('Order updated'); orderDetail(id); }).catch(err);
      });
      $('#delO').addEventListener('click', function () { if (confirm('Delete this order permanently? (Stock is NOT restored; cancel it first if needed.)')) DM.api('DELETE', '/orders/' + id).then(function () { go('#/orders'); }).catch(err); });
    });
  }

  /* ---------- 5. generic list / edit screens ---------- */
  var YN = [['true', 'Yes'], ['false', 'No']];
  var RES = {
    products: { title: 'Products', one: 'Product', cols: [['', function (r) { return thumb(r); }], ['Name', function (r) { return '<strong>' + esc(r.name) + '</strong><br><small class="muted">' + esc(r.sku || '') + (r.variants ? ' · ' + r.variants.length + ' variants' : '') + '</small>'; }], ['Price', function (r) { return DM.money(r.price) + (r.oldPrice ? '<br><s class="muted small">' + DM.money(r.oldPrice) + '</s>' : ''); }], ['Stock', function (r) { return r.stock <= 0 ? '<span class="badge badge-out">0</span>' : r.stock; }], ['Active', function (r) { return r.active ? '✔' : '—'; }]],
      fields: [['name', 'Name', 'text', { full: 1 }], ['sku', 'SKU (required to publish)', 'text'], ['slug', 'URL name (blank = automatic)', 'text'], ['categoryId', 'Category', 'category'], ['unit', 'Unit (1 kg, 12 pcs...)', 'text'], ['price', 'Price (৳)', 'number'], ['oldPrice', 'Old price (৳, for discount)', 'number', { opt: 1 }], ['stock', 'Stock (ignored when variants exist)', 'number'],
        ['emoji', 'Emoji (when no picture)', 'text'], ['image', 'Main picture', 'image', { kind: 'product' }], ['images', 'More pictures (max 8)', 'images'], ['description', 'Description', 'textarea', { full: 1 }], ['variants', 'Variants (size / weight / colour with own price + stock)', 'variants', { full: 1 }],
        ['genericName', 'Generic name (medicine)', 'text', { opt: 1 }], ['manufacturer', 'Manufacturer (medicine)', 'text', { opt: 1 }], ['prescriptionRequired', 'Prescription (Rx) required', 'check'], ['featured', 'Featured', 'check'], ['active', 'Active (visible in shop)', 'check'], ['offerStartsAt', 'Offer starts (optional)', 'date'], ['offerEndsAt', 'Offer ends (optional)', 'date']],
      blank: { unit: '1 pc', emoji: '🛒', price: 0, stock: 0, active: true } },
    categories: { title: 'Categories', one: 'Category', cols: [['', function (r) { return r.image ? '<img class="thumb-s" src="' + esc(r.image) + '">' : '<span class="emoji">' + esc(r.emoji) + '</span>'; }], ['Name', function (r) { return '<strong>' + esc(r.name) + '</strong>'; }], ['Type', function (r) { return esc(r.kind); }], ['Order', function (r) { return r.sortOrder; }], ['Active', function (r) { return r.active ? '✔' : '—'; }]],
      fields: [['name', 'Name', 'text'], ['kind', 'Type', 'select', { opts: [['grocery', 'Grocery'], ['medicine', 'Medicine']] }], ['emoji', 'Emoji', 'text'], ['image', 'Icon picture (optional)', 'image', { kind: 'category' }], ['coverImage', 'Cover picture (category page)', 'image', { kind: 'banner' }], ['coverTitle', 'Cover title', 'text', { opt: 1 }], ['description', 'Description', 'text', { opt: 1 }], ['sortOrder', 'Sort order (small = first)', 'number'], ['hideOnHome', 'Hide on home page', 'check'], ['active', 'Active', 'check']],
      blank: { kind: 'grocery', emoji: '🛍️', sortOrder: 10, active: true } },
    banners: { title: 'Banners (home slider)', one: 'Banner', cols: [['', function (r) { return '<img class="thumb-s wide" src="' + esc(r.image) + '">'; }], ['Title', function (r) { return esc(r.title); }], ['Order', function (r) { return r.sortOrder; }], ['Active', function (r) { return r.active ? '✔' : '—'; }]],
      fields: [['image', 'Cover image (wide, e.g. 1600×600)', 'image', { kind: 'banner' }], ['mobileImage', 'Mobile image (optional)', 'image', { kind: 'banner' }], ['title', 'Title', 'text', { opt: 1 }], ['subtitle', 'Subtitle', 'text', { opt: 1 }], ['ctaLabel', 'Button text', 'text', { opt: 1 }], ['ctaHref', 'Button link (e.g. /products.html?sale=1)', 'text'], ['sortOrder', 'Sort order', 'number'], ['active', 'Active', 'check']],
      blank: { ctaHref: '/products.html', sortOrder: 1, active: true } },
    offers: { title: 'Offers & coupons', one: 'Offer', cols: [['Title', function (r) { return '<strong>' + esc(r.title) + '</strong>'; }], ['Code', function (r) { return esc(r.code || '—'); }], ['Discount', function (r) { return r.discountType === 'percent' ? r.discountValue + '%' : DM.money(r.discountValue); }], ['Min order', function (r) { return DM.money(r.minOrder); }], ['Dates', function (r) { return esc((r.startsAt || '…') + ' → ' + (r.endsAt || '…')); }], ['Active', function (r) { return r.active ? '✔' : '—'; }]],
      fields: [['title', 'Title', 'text'], ['code', 'Coupon code (blank = display-only offer)', 'text', { opt: 1 }], ['discountType', 'Discount type', 'select', { opts: [['percent', 'Percent %'], ['flat', 'Flat ৳']] }], ['discountValue', 'Discount value', 'number'], ['minOrder', 'Minimum order (৳)', 'number'], ['startsAt', 'Starts (optional)', 'date'], ['endsAt', 'Ends (optional, inclusive)', 'date'], ['badge', 'Badge text (e.g. Mega)', 'text', { opt: 1 }], ['image', 'Poster image (optional)', 'image', { kind: 'offer' }], ['description', 'Description', 'text', { opt: 1 }], ['active', 'Active', 'check']],
      blank: { discountType: 'percent', discountValue: 10, minOrder: 0, active: true } },
    zones: { title: 'Delivery areas', one: 'Delivery area', cols: [['Name', function (r) { return '<strong>' + esc(r.name) + '</strong>'; }], ['Charge', function (r) { return DM.money(r.charge); }], ['Free over', function (r) { return r.freeOver ? DM.money(r.freeOver) : '—'; }], ['ETA', function (r) { return esc(r.eta); }], ['Active', function (r) { return r.active ? '✔' : '—'; }]],
      fields: [['name', 'Area name', 'text'], ['charge', 'Delivery charge (৳)', 'number'], ['freeOver', 'Free delivery over (৳, 0 = off)', 'number'], ['eta', 'Delivery time text', 'text'], ['viaCourier', 'Delivered by courier (outside Dhaka)', 'check'], ['sortOrder', 'Sort order', 'number'], ['active', 'Active', 'check']], blank: { charge: 60, freeOver: 0, active: true, sortOrder: 5 } },
    couriers: { title: 'Couriers', one: 'Courier', cols: [['Name', function (r) { return '<strong>' + esc(r.name) + '</strong>'; }], ['Phone', function (r) { return esc(r.phone); }], ['Active', function (r) { return r.active ? '✔' : '—'; }]],
      fields: [['name', 'Courier name', 'text'], ['phone', 'Phone', 'text', { opt: 1 }], ['trackingUrl', 'Tracking page link', 'text', { opt: 1 }], ['charge', 'Typical charge (৳)', 'number'], ['note', 'Note', 'text', { opt: 1 }], ['sortOrder', 'Sort order', 'number'], ['active', 'Active', 'check']], blank: { active: true, charge: 0, sortOrder: 1 } },
    'payment-methods': { title: 'Payment methods (extra)', one: 'Payment method', cols: [['Name', function (r) { return esc(r.icon || '') + ' <strong>' + esc(r.label) + '</strong>'; }], ['Number', function (r) { return esc(r.number || '—'); }], ['Active', function (r) { return r.active ? '✔' : '—'; }]],
      fields: [['label', 'Label (e.g. Rocket)', 'text'], ['icon', 'Emoji', 'text', { opt: 1 }], ['number', 'Account number', 'text', { opt: 1 }], ['hint', 'Hint text', 'text', { opt: 1 }], ['requireTrx', 'Customer must enter TrxID', 'check'], ['sortOrder', 'Sort order', 'number'], ['active', 'Active', 'check']], blank: { active: true, requireTrx: true, sortOrder: 5 } }
  };
  function thumb(r) { var i = r.image || (r.images && r.images[0]); return i ? '<img class="thumb-s" src="' + esc(i) + '" alt="">' : '<span class="emoji">' + esc(r.emoji || '🛒') + '</span>'; }
  function resList(name) {
    var R = RES[name];
    return DM.api('GET', '/' + name + (name === 'products' ? '?limit=500' : '')).then(function (res) {
      var list = res.items || res, q = '';
      function draw() {
        var shown = list.filter(function (r) { return !q || JSON.stringify([r.name, r.title, r.label, r.sku, r.code]).toLowerCase().indexOf(q) !== -1; });
        view().innerHTML = head(R.title + ' (' + list.length + ')', '<a class="btn btn-primary" href="#/' + name + '/new">+ Add ' + esc(R.one) + '</a>') +
          (name === 'products' || list.length > 8 ? '<input id="lq" placeholder="Search..." value="' + esc(q) + '" style="max-width:300px">' : '') +
          '<div class="table-wrap"><table class="table"><thead><tr>' + R.cols.map(function (c) { return '<th>' + esc(c[0]) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
          (shown.map(function (r) { return '<tr>' + R.cols.map(function (c) { return '<td>' + c[1](r) + '</td>'; }).join('') + '<td class="table-actions"><a href="#/' + name + '/' + esc(r.id) + '">Edit</a> <button class="link-danger" data-del="' + esc(r.id) + '">Delete</button></td></tr>'; }).join('') || '<tr><td colspan="9" class="muted">Nothing here yet.</td></tr>') + '</tbody></table></div>';
        var lq = $('#lq'); if (lq) { lq.addEventListener('input', function () { q = lq.value.toLowerCase(); var pos = lq.selectionStart; draw(); var n = $('#lq'); n.focus(); n.setSelectionRange(pos, pos); }); }
        document.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () { if (confirm('Delete this ' + R.one.toLowerCase() + '?')) DM.api('DELETE', '/' + name + '/' + b.dataset.del).then(function () { DM.toast('Deleted'); resList(name); }).catch(err); }); });
      }
      draw();
    });
  }
  function fieldHtml(f, v, cats) {
    var k = f[0], label = f[1], type = f[2], o = f[3] || {}, name = 'name="' + k + '"';
    var inner;
    if (type === 'text') inner = '<input ' + name + ' value="' + esc(v) + '">';
    else if (type === 'date') inner = '<input type="date" ' + name + ' value="' + esc(v) + '">';
    else if (type === 'number') inner = '<input type="number" step="any" ' + name + ' value="' + esc(v) + '">';
    else if (type === 'color') inner = '<input type="color" ' + name + ' value="' + esc(v || '#1e3a8a') + '">';
    else if (type === 'textarea') inner = '<textarea rows="4" ' + name + '>' + esc(v) + '</textarea>';
    else if (type === 'check') return '<label class="check"><input type="checkbox" ' + name + (v ? ' checked' : '') + '> ' + esc(label) + '</label>';
    else if (type === 'select') inner = '<select ' + name + '>' + o.opts.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>';
    else if (type === 'category') inner = '<select ' + name + '><option value="">— choose —</option>' + cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === v ? ' selected' : '') + '>' + esc(c.emoji + ' ' + c.name) + '</option>'; }).join('') + '</select>';
    else if (type === 'image') inner = imageField(k, v, o.kind);
    else if (type === 'images') inner = '<div class="imgs" data-images="' + esc(JSON.stringify(v || [])) + '" ' + name + '></div>';
    else if (type === 'variants') inner = '<div class="variants-ed" data-variants="' + esc(JSON.stringify(v || [])) + '" ' + name + '></div>';
    return '<label class="' + (o.full ? 'full' : '') + '">' + esc(label) + inner + '</label>';
  }
  function imageField(k, v, kind) {
    return '<div class="img-field" data-kind="' + esc(kind || 'general') + '"><input type="hidden" name="' + k + '" value="' + esc(v) + '"><div class="img-prev">' + (v ? '<img src="' + esc(v) + '" alt="">' : '') + '</div><input type="file" accept="image/*" class="img-file"> <button type="button" class="link-danger img-clear">Remove</button></div>';
  }
  function upload(file, kind) { var fd = new FormData(); fd.append('file', file); fd.append('kind', kind || 'general'); return DM.api('POST', '/upload', fd, true); }
  function wireImages(form) {
    form.querySelectorAll('.img-field').forEach(function (w) {
      var hid = w.querySelector('input[type=hidden]'), prev = w.querySelector('.img-prev');
      w.querySelector('.img-file').addEventListener('change', function (e) { var f = e.target.files[0]; if (!f) return; prev.textContent = 'Uploading...'; upload(f, w.dataset.kind).then(function (r) { hid.value = r.url; prev.innerHTML = '<img src="' + esc(r.url) + '" alt="">'; }).catch(function (x) { prev.textContent = ''; err(x); }); });
      w.querySelector('.img-clear').addEventListener('click', function () { hid.value = ''; prev.innerHTML = ''; });
    });
    form.querySelectorAll('[data-images]').forEach(function (w) {
      var list = JSON.parse(w.dataset.images);
      function draw() { w.innerHTML = '<div class="img-row">' + list.map(function (u, i) { return '<span class="img-item"><img src="' + esc(u) + '" alt=""><button type="button" data-rm="' + i + '">×</button></span>'; }).join('') + '</div>' + (list.length < 8 ? '<input type="file" accept="image/*" class="add-img">' : '');
        w.querySelectorAll('[data-rm]').forEach(function (b) { b.addEventListener('click', function () { list.splice(+b.dataset.rm, 1); draw(); }); });
        var a = w.querySelector('.add-img'); if (a) a.addEventListener('change', function () { if (a.files[0]) upload(a.files[0], 'product').then(function (r) { list.push(r.url); draw(); }).catch(err); }); }
      w.getList = function () { return list; }; draw();
    });
    form.querySelectorAll('[data-variants]').forEach(function (w) {
      var list = JSON.parse(w.dataset.variants);
      function draw() { w.innerHTML = (list.length ? '<table class="table vtable"><thead><tr><th>Size</th><th>Weight</th><th>Colour</th><th>Price</th><th>Old price</th><th>Stock</th><th>SKU</th><th></th></tr></thead><tbody>' + list.map(function (v, i) {
        var c = function (k, t) { return '<td><input data-vi="' + i + '" data-vk="' + k + '" type="' + (t || 'text') + '" value="' + esc(v[k] == null ? '' : v[k]) + '"></td>'; };
        return '<tr>' + c('size') + c('weight') + c('color') + c('price', 'number') + c('oldPrice', 'number') + c('stock', 'number') + c('sku') + '<td><button type="button" class="link-danger" data-vrm="' + i + '">×</button></td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted small">No variants: the product uses its own price and stock.</p>') + '<button type="button" class="btn btn-outline btn-sm" id="addV">+ Add variant</button>';
        w.querySelectorAll('[data-vi]').forEach(function (inp) { inp.addEventListener('input', function () { var v = list[+inp.dataset.vi], k = inp.dataset.vk; v[k] = inp.type === 'number' ? (inp.value === '' ? null : Number(inp.value)) : inp.value; }); });
        w.querySelectorAll('[data-vrm]').forEach(function (b) { b.addEventListener('click', function () { list.splice(+b.dataset.vrm, 1); draw(); }); });
        w.querySelector('#addV').addEventListener('click', function () { list.push({ price: 0, stock: 0 }); draw(); }); }
      w.getList = function () { return list; }; draw();
    });
  }
  function resForm(name, id) {
    var R = RES[name], isNew = id === 'new';
    return Promise.all([isNew ? Promise.resolve(Object.assign({}, R.blank)) : DM.api('GET', '/' + name + '/' + id), name === 'products' ? DM.api('GET', '/categories') : Promise.resolve([])]).then(function (r) {
      var rec = r[0], cats = r[1];
      view().innerHTML = head((isNew ? 'Add ' : 'Edit ') + R.one, '<a class="btn btn-outline btn-sm" href="#/' + name + '">← Back</a>') + '<form id="rf" class="card form-card form-grid" novalidate>' + R.fields.map(function (f) { return fieldHtml(f, rec[f[0]] == null ? '' : rec[f[0]], cats); }).join('') + '<div class="full" id="rfMsg"></div><div class="full"><button class="btn btn-primary">Save</button></div></form>';
      var form = $('#rf'); wireImages(form);
      form.addEventListener('submit', function (e) {
        e.preventDefault(); var body = {};
        R.fields.forEach(function (f) {
          var k = f[0], t = f[2], o = f[3] || {}, el = form.elements[k];
          if (t === 'check') body[k] = el.checked;
          else if (t === 'images' || t === 'variants') body[k] = form.querySelector('[name=' + k + ']').getList();
          else if (t === 'number') body[k] = el.value === '' ? (o.opt ? null : 0) : Number(el.value);
          else { var v = el.value; body[k] = v === '' && (o.opt || t === 'date' || t === 'image') ? null : v; }
        });
        Object.keys(body).forEach(function (k) { if (body[k] === null && !isNew) body[k] = null; });
        DM.api(isNew ? 'POST' : 'PUT', '/' + name + (isNew ? '' : '/' + id), clean(body)).then(function () { DM.toast('Saved'); go('#/' + name); }).catch(function (x) { $('#rfMsg').innerHTML = DM.alertHtml('error', x.message + (x.details ? ' — ' + Object.keys(x.details).map(function (k) { return k + ': ' + x.details[k]; }).join('; ') : '')); window.scrollTo(0, document.body.scrollHeight); });
      });
    });
  }
  function clean(o) { var r = {}; Object.keys(o).forEach(function (k) { if (o[k] !== null) r[k] = o[k]; }); return r; }

  /* ---------- 6. customers ---------- */
  var cuf = { q: '', segment: '' };
  function customers() {
    return DM.api('GET', '/admin/customers?q=' + encodeURIComponent(cuf.q) + '&segment=' + cuf.segment).then(function (d) {
      view().innerHTML = head('Customers (' + d.total + ')', '<button class="btn btn-primary" id="addC">+ Add customer</button>') + '<div class="stats">' + ['new', 'regular', 'vip', 'inactive'].map(function (s) { return '<div class="stat card"><strong>' + d.segments[s] + '</strong><span>' + s + '</span></div>'; }).join('') + '<div class="stat card"><strong>' + DM.money(d.spent) + '</strong><span>total spent</span></div></div>' +
        '<div class="filter-bar"><a data-sg="" class="' + (!cuf.segment ? 'active' : '') + '">All</a>' + ['new', 'regular', 'vip', 'inactive'].map(function (s) { return '<a data-sg="' + s + '" class="' + (cuf.segment === s ? 'active' : '') + '">' + s + '</a>'; }).join('') + '</div>' +
        '<form id="cq" class="coupon-form"><input name="q" placeholder="Name or phone" value="' + esc(cuf.q) + '"><button class="btn btn-outline btn-sm">Search</button></form><div id="cform"></div>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Customer</th><th>Area</th><th>Orders</th><th>Spent</th><th>Segment</th><th>Last order</th></tr></thead><tbody>' + (d.items.map(function (c) { return '<tr><td><a href="#/customers/' + esc(c.id) + '"><strong>' + esc(c.name) + '</strong></a><br><small class="muted">' + esc(c.phone) + '</small></td><td>' + esc(c.area || '') + '</td><td>' + c.orderCount + '</td><td>' + DM.money(c.totalSpent) + '</td><td>' + esc(c.segment) + (c.status === 'blocked' ? ' · <span class="badge badge-out">blocked</span>' : '') + '</td><td>' + DM.fmtDate(c.lastOrderAt) + '</td></tr>'; }).join('') || '<tr><td colspan="6" class="muted">No customers yet. They appear automatically when people order.</td></tr>') + '</tbody></table></div>';
      document.querySelectorAll('[data-sg]').forEach(function (a) { a.addEventListener('click', function () { cuf.segment = a.dataset.sg; customers(); }); });
      $('#cq').addEventListener('submit', function (e) { e.preventDefault(); cuf.q = e.target.q.value.trim(); customers(); });
      $('#addC').addEventListener('click', function () {
        $('#cform').innerHTML = '<form class="card form-card form-grid" id="ncf"><label>Name<input name="name"></label><label>Phone<input name="phone" type="tel"></label><label>Area<input name="area"></label><label>Address<input name="address"></label><div class="full" id="ncm"></div><div class="full"><button class="btn btn-primary">Save customer</button></div></form>';
        $('#ncf').addEventListener('submit', function (e) { e.preventDefault(); var f = e.target; DM.api('POST', '/admin/customers', { name: f.name.value, phone: f.phone.value, area: f.area.value, address: f.address.value }).then(function () { DM.toast('Customer added'); customers(); }).catch(function (x) { $('#ncm').innerHTML = DM.alertHtml('error', x.message); }); });
      });
    });
  }
  function customerDetail(id) {
    return DM.api('GET', '/admin/customers/' + encodeURIComponent(id)).then(function (d) {
      var c = d.customer;
      view().innerHTML = head(c.name, '<a class="btn btn-outline btn-sm" href="#/customers">← Back</a>') + '<div class="two-col"><form id="cf" class="card form-card"><label>Name<input name="name" value="' + esc(c.name) + '"></label><p>📞 ' + esc(c.phone) + ' <small class="muted">(this is the customer ID)</small></p><label>Address<input name="address" value="' + esc(c.address || '') + '"></label><label>Area<input name="area" value="' + esc(c.area || '') + '"></label><label>Notes<textarea name="notes" rows="3">' + esc(c.notes || '') + '</textarea></label>' +
        '<label>Status<select name="status"><option value="active"' + (c.status === 'active' ? ' selected' : '') + '>Active</option><option value="blocked"' + (c.status === 'blocked' ? ' selected' : '') + '>Blocked (cannot order online)</option></select></label><button class="btn btn-primary">Save</button> <button type="button" class="btn btn-danger btn-sm" id="dc">Delete</button></form>' +
        '<div class="card info-card"><h3>' + esc(c.segment) + ' customer</h3><p>' + c.orderCount + ' orders · ' + DM.money(c.totalSpent) + '</p><table class="table"><tbody>' + d.orders.map(function (o) { return '<tr><td><a href="#/orders/' + esc(o.id) + '">' + esc(o.orderNo) + '</a></td><td>' + DM.money(o.total) + '</td><td>' + DM.statusBadge(o.status) + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
      $('#cf').addEventListener('submit', function (e) { e.preventDefault(); var f = e.target; DM.api('PUT', '/admin/customers/' + encodeURIComponent(id), { name: f.name.value, address: f.address.value, area: f.area.value, notes: f.notes.value, status: f.status.value }).then(function () { DM.toast('Saved'); customerDetail(id); }).catch(err); });
      $('#dc').addEventListener('click', function () { if (confirm('Delete this customer record? Their orders are kept. (Owner only)')) DM.api('DELETE', '/admin/customers/' + encodeURIComponent(id)).then(function () { go('#/customers'); }).catch(err); });
    });
  }

  /* ---------- 7. inventory ---------- */
  function inventory() {
    return Promise.all([DM.api('GET', '/products?limit=500'), DM.api('GET', '/admin/inventory')]).then(function (r) {
      var prods = r[0].items, logs = r[1];
      view().innerHTML = head('Inventory') + '<form id="invF" class="card form-card form-grid"><label class="full">Product<select name="productId">' + prods.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + ' (stock ' + p.stock + ')</option>'; }).join('') + '</select></label><label>Variant (if any)<select name="variantId"></select></label>' +
        '<label>Action<select name="mode"><option value="add">Add stock</option><option value="remove">Remove stock</option><option value="set">Set stock to</option></select></label><label>Quantity<input type="number" name="qty" min="0" value="1"></label><label>Reason<input name="reason" placeholder="Restock, damaged, count..."></label><div class="full" id="invM"></div><div class="full"><button class="btn btn-primary">Update stock</button></div></form>' +
        '<h3>Recent stock changes</h3><div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th>Before</th><th>After</th><th>Change</th><th>Reason</th><th>When</th></tr></thead><tbody>' + logs.map(function (l) { return '<tr><td>' + esc(l.productName) + '</td><td>' + l.before + '</td><td>' + l.after + '</td><td>' + (l.change > 0 ? '+' : '') + l.change + '</td><td>' + esc(l.reason) + '</td><td>' + DM.fmtDate(l.createdAt, true) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      var f = $('#invF');
      function fillV() { var p = prods.filter(function (x) { return x.id === f.productId.value; })[0]; f.variantId.innerHTML = p && p.variants ? p.variants.map(function (v) { return '<option value="' + esc(v.id) + '">' + esc(DM.variantLabel(v)) + ' (stock ' + v.stock + ')</option>'; }).join('') : '<option value="">— no variants —</option>'; }
      f.productId.addEventListener('change', fillV); fillV();
      f.addEventListener('submit', function (e) { e.preventDefault(); DM.api('POST', '/admin/inventory', { productId: f.productId.value, variantId: f.variantId.value || undefined, mode: f.mode.value, qty: Number(f.qty.value), reason: f.reason.value }).then(function () { DM.toast('Stock updated'); inventory(); }).catch(function (x) { $('#invM').innerHTML = DM.alertHtml('error', x.message); }); });
    });
  }

  /* ---------- 8. settings ---------- */
  var SECT = { hero: 'Hero banner', features: 'Feature boxes', categories: 'Categories', buyAgain: 'Buy again', best: 'Best sellers', daily: 'Daily essentials', fresh: 'Fresh food', household: 'Household', offerProducts: 'Offer products', offers: 'Deals & coupons', sale: 'Hot deals', medicine: 'Medicine', new: 'New arrivals' };
  var SET_FIELDS = [
    ['Store', [['storeName', 'Store name', 'text'], ['tagline', 'Tagline', 'text'], ['logo', 'Logo', 'image'], ['phone', 'Phone', 'text'], ['whatsapp', 'WhatsApp number (with country code)', 'text'], ['email', 'Email', 'text'], ['address', 'Address', 'text'], ['hours', 'Opening hours', 'text'], ['facebook', 'Facebook link', 'text'], ['mapUrl', 'Map link', 'text'], ['announcement', 'Top announcement bar', 'text'], ['footerText', 'Footer text', 'text']]],
    ['Look', [['primaryColor', 'Main colour', 'color'], ['accentColor', 'Accent colour', 'color'], ['heroTitle', 'Hero title', 'textarea'], ['heroSubtitle', 'Hero subtitle', 'text'], ['heroCta', 'Hero button text', 'text'], ['homeBestTitle', 'Best sellers title', 'text'], ['homeDailyTitle', 'Daily essentials title', 'text'], ['homeFreshTitle', 'Fresh food title', 'text'], ['homeHouseholdTitle', 'Household title', 'text'], ['emptyStateTitle', 'Empty-search title', 'text'], ['emptyStateText', 'Empty-search text', 'text']]],
    ['Delivery & orders', [['serviceCharge', 'Service charge per order (৳)', 'number'], ['minOrder', 'Minimum order (৳, 0 = none)', 'number'], ['courierOutsideNote', 'Outside-Dhaka note', 'text']]],
    ['Payments', [['payCod', 'Cash on delivery', 'check'], ['payBkash', 'bKash (manual)', 'check'], ['bkashNumber', 'bKash number', 'text'], ['payNagad', 'Nagad (manual)', 'check'], ['nagadNumber', 'Nagad number', 'text'], ['payOnline', 'Show "Online payment (coming soon)"', 'check'], ['payInstructions', 'Payment instructions', 'textarea']]],
    ['Medicine', [['showMedicine', 'Show medicine section', 'check'], ['medicineTitle', 'Medicine title', 'text'], ['medicineNotice', 'Prescription notice', 'textarea']]],
    ['Policies', [['returnPolicy', 'Return policy', 'textarea'], ['exchangePolicy', 'Exchange policy', 'textarea']]],
    ['Support & SEO', [['showSupportWa', 'Show WhatsApp button', 'check'], ['supportWaLabel', 'WhatsApp button text', 'text'], ['seoTitle', 'SEO title', 'text'], ['seoDescription', 'SEO description', 'text']]]
  ];
  function settings() {
    return DM.api('GET', '/settings').then(function (S) {
      var sections = S.homeSections.slice(), cats = null;
      view().innerHTML = head('Settings') + '<form id="sf" class="card form-card">' + SET_FIELDS.map(function (g) { return '<h3>' + esc(g[0]) + '</h3><div class="form-grid">' + g[1].map(function (f) { return fieldHtml([f[0], f[1], f[2], f[2] === 'textarea' ? { full: 1 } : { kind: 'general' }], S[f[0]] == null ? '' : S[f[0]], []); }).join('') + '</div>'; }).join('') +
        '<h3>Feature boxes (home page, max 4)</h3><div id="featEd"></div><h3>Home page sections (order &amp; visibility)</h3><ul class="sec-list" id="secList"></ul><div id="sfMsg"></div><button class="btn btn-primary">Save settings</button></form>';
      var form = $('#sf'); wireImages(form);
      var feats = (S.features || []).slice(0, 4);
      function drawFeats() { $('#featEd').innerHTML = feats.map(function (f, i) { return '<div class="form-grid feat-row"><label>Icon (emoji or truck/leaf/cash/tag)<input data-fi="' + i + '" data-fk="icon" value="' + esc(f.icon || '') + '"></label><label>Title<input data-fi="' + i + '" data-fk="title" value="' + esc(f.title || '') + '"></label><label>Text<input data-fi="' + i + '" data-fk="text" value="' + esc(f.text || '') + '"></label></div>'; }).join('');
        document.querySelectorAll('[data-fi]').forEach(function (inp) { inp.addEventListener('input', function () { feats[+inp.dataset.fi][inp.dataset.fk] = inp.value; }); }); }
      drawFeats();
      function drawSecs() { $('#secList').innerHTML = sections.map(function (s, i) { return '<li><label class="check"><input type="checkbox" data-sv="' + i + '"' + (s.visible !== false ? ' checked' : '') + '> ' + esc(SECT[s.id] || s.id) + '</label><span><button type="button" class="btn btn-sm btn-light" data-up="' + i + '">↑</button> <button type="button" class="btn btn-sm btn-light" data-dn="' + i + '">↓</button></span></li>'; }).join('');
        document.querySelectorAll('[data-sv]').forEach(function (c) { c.addEventListener('change', function () { sections[+c.dataset.sv].visible = c.checked; }); });
        document.querySelectorAll('[data-up]').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.up; if (i > 0) { var t = sections[i]; sections[i] = sections[i - 1]; sections[i - 1] = t; drawSecs(); } }); });
        document.querySelectorAll('[data-dn]').forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.dn; if (i < sections.length - 1) { var t = sections[i]; sections[i] = sections[i + 1]; sections[i + 1] = t; drawSecs(); } }); }); }
      drawSecs();
      form.addEventListener('submit', function (e) {
        e.preventDefault(); var body = {};
        SET_FIELDS.forEach(function (g) { g[1].forEach(function (f) { var el = form.elements[f[0]]; body[f[0]] = f[2] === 'check' ? el.checked : f[2] === 'number' ? Number(el.value || 0) : el.value; }); });
        body.homeSections = sections; body.features = feats.filter(function (f) { return f.title; });
        DM.api('PUT', '/settings', body).then(function () { DM.toast('Settings saved'); }).catch(function (x) { $('#sfMsg').innerHTML = DM.alertHtml('error', x.message); });
      });
    });
  }

  start();
})();
