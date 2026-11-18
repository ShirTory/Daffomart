/* =====================================================================
   DaffoMart  -  admin.js
   The whole admin panel on ONE page (admin/index.html). The page is chosen by the part after "#":
   #/dashboard  #/orders  #/order/<key>  #/invoice/<key>  #/products  #/product/<slug|new>
   #/categories  #/coupons  #/applications  #/password
   Only users who have a document admins/<uid> in Firestore can use it (security rules enforce this).
   ===================================================================== */
(function () {
  var DB = DM.db, esc = DM.esc, money = DM.money;
  var root = document.getElementById('adminRoot');
  var ME = null;

  var STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  var APP_STATUSES = ['new', 'contacted', 'approved', 'rejected'];

  /* ---------- small helpers ---------- */
  function toast(msg) {
    var box = document.getElementById('toasts');
    var t = document.createElement('div');
    t.className = 'toast toast-info'; t.textContent = msg; box.appendChild(t);
    setTimeout(function () { t.classList.add('hide'); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }
  function alertBox(type, msg) { return '<div class="alert alert-' + type + '">' + esc(msg) + '</div>'; }
  function badge(status) { return '<span class="status status-' + esc(status) + '">' + esc(DM.statusLabel(status)) + '</span>'; }
  function opts(list, current, labeler) {
    return list.map(function (v) { return '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(labeler ? labeler(v) : v) + '</option>'; }).join('');
  }
  function num(v) { return v === '' || v == null ? null : Number(v); }
  // stops spreadsheet formula injection in CSV files
  function csvSafe(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) { s = "'" + s; }
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function fail(e) { return alertBox('error', DB.errorText ? DB.errorText(e) : (e && e.message) || 'Something went wrong.'); }

  /* ---------- layout ---------- */
  var NAV = [['dashboard', '📊 Dashboard'], ['orders', '🧾 Orders'], ['products', '📦 Products'], ['categories', '🗂️ Categories'],
             ['coupons', '🏷️ Coupons'], ['applications', '🛵 Rider applications'], ['password', '🔑 Password']];

  function shell(active, title, inner) {
    root.innerHTML =
      '<div class="admin-wrap">' +
      '<aside class="admin-side"><h2>DaffoMart Admin</h2>' +
      NAV.map(function (n) { return '<a href="#/' + n[0] + '"' + (n[0] === active ? ' class="active"' : '') + '>' + n[1] + '</a>'; }).join('') +
      '<a href="../index.html" target="_blank" rel="noopener">🌐 View shop</a>' +
      '<div class="side-foot">' + esc(ME.email) + '<br><button class="btn btn-light btn-sm" id="logoutBtn">Logout</button></div></aside>' +
      '<main class="admin-main"><div class="admin-top"><h1>' + esc(title) + '</h1></div><div id="adminContent">' + inner + '</div></main></div>';
    document.getElementById('logoutBtn').onclick = function () { DB.logout().then(function () { location.hash = ''; render(); }); };
  }
  function content() { return document.getElementById('adminContent'); }

  /* ---------- login ---------- */
  function loginScreen(message) {
    var demoHint = DB.demo ? '<div class="alert alert-info">Demo mode: login with <strong>admin@daffomart.test</strong> / <strong>admin123</strong></div>' : '';
    root.innerHTML =
      '<div class="admin-login card form-card"><h1>Admin login</h1>' + demoHint + (message || '') +
      '<div id="adminLoginError"></div>' +
      '<form id="adminLogin"><label>Email<input type="email" name="email" required autocomplete="email"></label>' +
      '<label>Password<input type="password" name="password" required autocomplete="current-password"></label>' +
      '<button class="btn btn-primary btn-block">Login</button></form></div>';
    document.getElementById('adminLogin').onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('button'); btn.disabled = true;
      DB.login(f.email.value.trim(), f.password.value).then(function () { render(); }).catch(function (err) {
        btn.disabled = false;
        document.getElementById('adminLoginError').innerHTML = fail(err);
      });
    };
  }

  function notAdminScreen() {
    root.innerHTML =
      '<div class="admin-login card form-card"><h1>No admin access</h1>' +
      alertBox('error', 'You are logged in as ' + ME.email + ', but this account is not an admin.') +
      '<p>To make this account an admin, open <strong>Firebase Console &rarr; Firestore Database</strong>, create a collection <code>admins</code> and add a document with this exact ID:</p>' +
      '<p class="code-box">' + esc(ME.uid) + '</p><p class="muted">Add any field, e.g. <code>role</code> = <code>admin</code>. Then reload this page.</p>' +
      '<button class="btn btn-light" id="logoutBtn">Logout</button></div>';
    document.getElementById('logoutBtn').onclick = function () { DB.logout().then(render); };
  }

  /* ---------- dashboard ---------- */
  async function dashboard() {
    shell('dashboard', 'Dashboard', '<p class="loading">Loading...</p>');
    try {
      var r = await Promise.all([DB.admin.listOrders(), DB.admin.listProducts(), DB.admin.listApplications()]);
      var orders = r[0], products = r[1], apps = r[2];
      var live = orders.filter(function (o) { return o.status !== 'cancelled'; });
      var revenue = live.filter(function (o) { return o.status === 'delivered'; }).reduce(function (s, o) { return s + o.total; }, 0);
      var pending = orders.filter(function (o) { return o.status === 'pending'; }).length;
      var newApps = apps.filter(function (a) { return a.status === 'new'; }).length;
      var low = products.filter(function (p) { return p.active && p.stock <= 5; });

      // last 7 days of sales (not cancelled)
      var days = [];
      for (var i = 6; i >= 0; i--) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); days.push({ start: d.getTime(), total: 0, label: d.toLocaleDateString('en-GB', { weekday: 'short' }) }); }
      live.forEach(function (o) {
        for (var k = days.length - 1; k >= 0; k--) { if (o.createdAt >= days[k].start) { days[k].total += o.total; break; } }
      });
      var max = Math.max.apply(null, days.map(function (x) { return x.total; }).concat([1]));

      var html = '';
      if (!products.length) {
        html += '<div class="alert alert-info">Your shop is empty. <button class="btn btn-primary btn-sm" id="seedBtn">Load sample data</button> (8 categories, 15 products, 2 coupons)</div>';
      }
      html += '<div class="stats">' +
        '<div class="card stat"><strong>' + orders.length + '</strong><span>Total orders</span></div>' +
        '<div class="card stat"><strong>' + pending + '</strong><span>Pending orders</span></div>' +
        '<div class="card stat"><strong>' + money(revenue) + '</strong><span>Delivered sales</span></div>' +
        '<div class="card stat"><strong>' + products.length + '</strong><span>Products</span></div>' +
        '<div class="card stat"><strong>' + newApps + '</strong><span>New rider applications</span></div></div>';
      html += '<div class="card chart-card"><h3>Sales - last 7 days</h3><div class="bars">' +
        days.map(function (x) {
          return '<div class="bar-col"><span class="bar-value">' + (x.total ? money(x.total) : '') + '</span><div class="bar" style="height:' + Math.round(x.total / max * 100) + '%"></div><span class="bar-label">' + esc(x.label) + '</span></div>';
        }).join('') + '</div></div>';

      html += '<div class="actions" style="margin-bottom:1rem"><button class="btn btn-light" id="csvBtn">⬇ Export orders (CSV)</button>' +
              '<button class="btn btn-light" id="mapBtn">⬇ Download sitemap.xml</button></div>';

      html += '<h2>Latest orders</h2><div class="card table-wrap">' + ordersTable(orders.slice(0, 8)) + '</div>';
      html += '<h2>Low stock (5 or less)</h2><div class="card table-wrap">' + (low.length ?
        '<table class="table"><thead><tr><th>Product</th><th>Stock</th><th></th></tr></thead><tbody>' + low.map(function (p) {
          return '<tr><td>' + esc(p.emoji) + ' ' + esc(p.name) + '</td><td>' + p.stock + '</td><td><a class="btn btn-sm btn-light" href="#/product/' + encodeURIComponent(p.slug) + '">Edit</a></td></tr>';
        }).join('') + '</tbody></table>' : '<p style="padding:1rem">Nothing is running low. 👍</p>') + '</div>';
      content().innerHTML = html;

      var seed = document.getElementById('seedBtn');
      if (seed) { seed.onclick = function () { seed.disabled = true; DB.seedSample().then(function () { toast('Sample data loaded'); dashboard(); }).catch(function (e) { content().insertAdjacentHTML('afterbegin', fail(e)); }); }; }
      document.getElementById('csvBtn').onclick = function () { exportOrders(orders); };
      document.getElementById('mapBtn').onclick = function () { downloadSitemap(products); };
    } catch (e) { content().innerHTML = fail(e); }
  }

  function exportOrders(orders) {
    var rows = [['Order no', 'Date', 'Customer', 'Phone', 'Address', 'Area', 'Subtotal', 'Discount', 'Delivery', 'Total', 'Coupon', 'Status']];
    orders.forEach(function (o) {
      rows.push([o.orderNo, DM.fmtDate(o.createdAt, true), o.customerName, o.phone, o.address, o.area, o.subtotal, o.discount, o.deliveryCharge, o.total, o.couponCode || '', o.status]);
    });
    download('daffomart-orders-' + DM.today() + '.csv', '﻿' + rows.map(function (r) { return r.map(csvSafe).join(','); }).join('\r\n'), 'text/csv;charset=utf-8');
  }

  function downloadSitemap(products) {
    var base = location.origin + location.pathname.replace(/admin\/?(index\.html)?$/, '');
    var pages = ['', 'products.html', 'track.html', 'join.html', 'contact.html', 'policy.html'];
    var urls = pages.map(function (p) { return base + p; }).concat(products.filter(function (p) { return p.active; }).map(function (p) { return base + 'product.html?slug=' + encodeURIComponent(p.slug); }));
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) { return '  <url><loc>' + esc(u) + '</loc></url>'; }).join('\n') + '\n</urlset>\n';
    download('sitemap.xml', xml, 'application/xml');
    toast('Put this file in the main folder of your site');
  }

  /* ---------- orders ---------- */
  function ordersTable(list) {
    if (!list.length) { return '<p style="padding:1rem">No orders yet.</p>'; }
    return '<table class="table"><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>' +
      list.map(function (o) {
        return '<tr><td>' + esc(o.orderNo) + '</td><td>' + esc(DM.fmtDate(o.createdAt, true)) + '</td><td>' + esc(o.customerName) + '<br><small class="muted">' + esc(o.phone) + '</small></td><td>' + money(o.total) + '</td><td>' + badge(o.status) + '</td>' +
          '<td><a class="btn btn-sm btn-light" href="#/order/' + esc(o.id) + '">View</a></td></tr>';
      }).join('') + '</tbody></table>';
  }

  async function orders(filter) {
    shell('orders', 'Orders', '<p class="loading">Loading...</p>');
    try {
      var all = await DB.admin.listOrders();
      var list = filter ? all.filter(function (o) { return o.status === filter; }) : all;
      var bar = '<div class="filter-bar"><a href="#/orders"' + (!filter ? ' class="active"' : '') + '>All (' + all.length + ')</a>' +
        STATUSES.map(function (s) {
          var n = all.filter(function (o) { return o.status === s; }).length;
          return '<a href="#/orders/' + s + '"' + (filter === s ? ' class="active"' : '') + '>' + esc(DM.statusLabel(s)) + ' (' + n + ')</a>';
        }).join('') + '</div><p><button class="btn btn-light btn-sm" id="csvBtn">⬇ Export CSV</button></p>';
      content().innerHTML = bar + '<div class="card table-wrap">' + ordersTable(list) + '</div>';
      document.getElementById('csvBtn').onclick = function () { exportOrders(list); };
    } catch (e) { content().innerHTML = fail(e); }
  }

  async function loadOrder(key) {
    var o = await DB.getOrder(key);
    return o;
  }

  async function orderView(key) {
    shell('orders', 'Order', '<p class="loading">Loading...</p>');
    try {
      var o = await loadOrder(key);
      if (!o) { content().innerHTML = alertBox('error', 'Order not found.') + '<a href="#/orders">&larr; Back</a>'; return; }
      var closed = o.status === 'cancelled';
      content().innerHTML =
        '<p><a href="#/orders">&larr; All orders</a></p>' +
        '<div class="two-col"><div class="card form-card"><h2>' + esc(o.orderNo) + ' ' + badge(o.status) + '</h2>' +
        '<p><strong>Date:</strong> ' + esc(DM.fmtDate(o.createdAt, true)) + '</p>' +
        '<p><strong>Customer:</strong> ' + esc(o.customerName) + '</p>' +
        '<p><strong>Phone:</strong> <a href="tel:' + esc(o.phone) + '">' + esc(o.phone) + '</a></p>' +
        '<p><strong>Address:</strong> ' + esc(o.address) + ' (' + (o.area === 'outside' ? 'outside Dhaka' : 'inside Dhaka') + ')</p>' +
        (o.note ? '<p><strong>Note:</strong> ' + esc(o.note) + '</p>' : '') +
        '<p><strong>Payment:</strong> Cash on delivery</p>' +
        '<hr>' + (closed ? '<p class="muted">This order is cancelled and cannot be changed.</p>' :
          '<label>Change status<select id="statusSel">' + opts(STATUSES, o.status, DM.statusLabel) + '</select></label><button class="btn btn-primary" id="statusBtn">Update status</button>') +
        ' <a class="btn btn-light" href="#/invoice/' + esc(key) + '">🖨 Invoice</a><div id="orderMsg"></div></div>' +
        '<div class="card table-wrap"><table class="table"><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>' +
        o.items.map(function (i) { return '<tr><td>' + esc(i.name) + '</td><td>' + money(i.unitPrice) + '</td><td>' + i.qty + '</td><td>' + money(i.lineTotal) + '</td></tr>'; }).join('') +
        '</tbody><tfoot><tr><td colspan="3">Subtotal</td><td>' + money(o.subtotal) + '</td></tr>' +
        (o.discount ? '<tr><td colspan="3">Discount' + (o.couponCode ? ' (' + esc(o.couponCode) + ')' : '') + '</td><td>-' + money(o.discount) + '</td></tr>' : '') +
        '<tr><td colspan="3">Delivery</td><td>' + money(o.deliveryCharge) + '</td></tr>' +
        '<tr><td colspan="3"><strong>Total</strong></td><td><strong>' + money(o.total) + '</strong></td></tr></tfoot></table></div></div>';
      var btn = document.getElementById('statusBtn');
      if (btn) {
        btn.onclick = function () {
          var s = document.getElementById('statusSel').value;
          if (s === o.status) { return; }
          if (s === 'cancelled' && !confirm('Cancel this order? The stock will be put back. This cannot be undone.')) { return; }
          btn.disabled = true;
          DB.admin.setOrderStatus(key, s).then(function () { toast('Status updated'); orderView(key); }).catch(function (e) {
            btn.disabled = false; document.getElementById('orderMsg').innerHTML = fail(e);
          });
        };
      }
    } catch (e) { content().innerHTML = fail(e); }
  }

  async function invoice(key) {
    root.innerHTML = '<p class="loading">Loading...</p>';
    try {
      var o = await loadOrder(key);
      if (!o) { root.innerHTML = alertBox('error', 'Order not found.'); return; }
      var s = DM.cfg.store;
      document.body.classList.add('invoice-body');
      root.innerHTML =
        '<div class="invoice"><p class="no-print"><a href="#/order/' + esc(key) + '">&larr; Back</a> <button class="btn btn-primary btn-sm" onclick="window.print()">Print</button></p>' +
        '<div class="invoice-head"><div><h1>INVOICE</h1><strong>' + esc(s.name) + '</strong><br>' + esc(s.address) + '<br>' + esc(s.phone) + '</div>' +
        '<div class="right"><strong>' + esc(o.orderNo) + '</strong><br>' + esc(DM.fmtDate(o.createdAt, true)) + '<br>Status: ' + esc(DM.statusLabel(o.status)) + '</div></div>' +
        '<p><strong>Bill to:</strong><br>' + esc(o.customerName) + '<br>' + esc(o.phone) + '<br>' + esc(o.address) + '</p>' +
        '<table class="table"><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>' +
        o.items.map(function (i) { return '<tr><td>' + esc(i.name) + '</td><td>' + money(i.unitPrice) + '</td><td>' + i.qty + '</td><td>' + money(i.lineTotal) + '</td></tr>'; }).join('') +
        '</tbody><tfoot><tr><td colspan="3">Subtotal</td><td>' + money(o.subtotal) + '</td></tr>' +
        (o.discount ? '<tr><td colspan="3">Discount</td><td>-' + money(o.discount) + '</td></tr>' : '') +
        '<tr><td colspan="3">Delivery</td><td>' + money(o.deliveryCharge) + '</td></tr>' +
        '<tr><td colspan="3"><strong>Total (cash on delivery)</strong></td><td><strong>' + money(o.total) + '</strong></td></tr></tfoot></table>' +
        '<p>Thank you for shopping with ' + esc(s.name) + '!</p></div>';
    } catch (e) { root.innerHTML = fail(e); }
  }

  /* ---------- products ---------- */
  async function products(query) {
    shell('products', 'Products', '<p class="loading">Loading...</p>');
    try {
      var r = await Promise.all([DB.admin.listProducts(), DB.admin.listCategories()]);
      var cats = {}; r[1].forEach(function (c) { cats[c.id] = c; });
      var all = r[0];
      function draw(q) {
        q = (q || '').toLowerCase();
        var list = all.filter(function (p) { return !q || (p.name + ' ' + p.genericName).toLowerCase().indexOf(q) > -1; });
        document.getElementById('prodRows').innerHTML = list.length ? list.map(function (p) {
          return '<tr><td><div class="thumb">' + (p.image ? '<img src="' + esc(p.image) + '" alt="">' : esc(p.emoji)) + '</div></td>' +
            '<td>' + esc(p.name) + (p.isRx ? ' <span class="badge badge-rx">Rx</span>' : '') + '<br><small class="muted">' + esc(p.unit) + '</small></td>' +
            '<td>' + esc(cats[p.categoryId] ? cats[p.categoryId].name : '-') + '</td><td>' + money(p.price) + '</td>' +
            '<td>' + (p.stock > 0 ? p.stock : '<span class="badge badge-out">Out</span>') + '</td>' +
            '<td>' + (p.active ? '<span class="badge badge-ok">Active</span>' : '<span class="badge badge-out">Hidden</span>') + '</td>' +
            '<td class="actions"><a class="btn btn-sm btn-light" href="#/product/' + encodeURIComponent(p.slug) + '">Edit</a> <button class="btn btn-sm btn-danger" data-del="' + esc(p.slug) + '">Delete</button></td></tr>';
        }).join('') : '<tr><td colspan="7">No products found.</td></tr>';
      }
      content().innerHTML = '<div class="actions" style="margin-bottom:1rem"><input type="search" id="prodSearch" placeholder="Search products..." style="margin:0;max-width:280px"><a class="btn btn-primary" href="#/product/new">+ Add product</a></div>' +
        '<div class="card table-wrap"><table class="table"><thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody id="prodRows"></tbody></table></div>';
      draw(query);
      var s = document.getElementById('prodSearch'); s.value = query || '';
      s.oninput = function () { draw(s.value); };
      document.getElementById('prodRows').onclick = function (e) {
        var b = e.target.closest('[data-del]'); if (!b) { return; }
        if (!confirm('Delete this product? Old orders keep its name.')) { return; }
        DB.admin.deleteProduct(b.getAttribute('data-del')).then(function () { toast('Product deleted'); products(s.value); }).catch(function (err) { content().insertAdjacentHTML('afterbegin', fail(err)); });
      };
    } catch (e) { content().innerHTML = fail(e); }
  }

  // shrink a chosen photo to max 600px and return a small JPEG data URL (stored inside the product document)
  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var scale = Math.min(1, 600 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = function () { reject(new Error('This file is not a picture.')); };
      img.src = url;
    });
  }

  async function productForm(slug) {
    var isNew = slug === 'new';
    shell('products', isNew ? 'Add product' : 'Edit product', '<p class="loading">Loading...</p>');
    try {
      var cats = await DB.admin.listCategories();
      var p = { name: '', categoryId: cats[0] ? cats[0].id : '', description: '', genericName: '', price: '', oldPrice: null, unit: '', emoji: '📦', image: '', stock: 0, featured: false, isRx: false, active: true };
      if (!isNew) {
        var all = await DB.admin.listProducts();
        var found = all.filter(function (x) { return x.slug === slug; })[0];
        if (!found) { content().innerHTML = alertBox('error', 'Product not found.') + '<a href="#/products">&larr; Back</a>'; return; }
        p = found;
      }
      if (!cats.length) { content().innerHTML = alertBox('error', 'Create a category first.') + '<a class="btn btn-primary" href="#/categories">Go to categories</a>'; return; }
      content().innerHTML =
        '<p><a href="#/products">&larr; All products</a></p><div id="prodMsg"></div>' +
        '<form class="card form-card" id="prodForm" novalidate><div class="form-grid">' +
        '<label>Name<input name="name" required value="' + esc(p.name) + '"></label>' +
        '<label>Category<select name="categoryId">' + cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === p.categoryId ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
        '<label>Price (৳)<input name="price" type="number" min="0" step="0.01" required value="' + esc(p.price) + '"></label>' +
        '<label>Old price (৳, optional)<input name="oldPrice" type="number" min="0" step="0.01" value="' + esc(p.oldPrice == null ? '' : p.oldPrice) + '"></label>' +
        '<label>Unit (e.g. 1 kg)<input name="unit" value="' + esc(p.unit) + '"></label>' +
        '<label>Stock<input name="stock" type="number" min="0" step="1" required value="' + esc(p.stock) + '"></label>' +
        '<label>Emoji<input name="emoji" maxlength="8" value="' + esc(p.emoji) + '"></label>' +
        '<label>Generic name (medicine)<input name="genericName" value="' + esc(p.genericName) + '"></label>' +
        '<label class="full">Description<textarea name="description" rows="3">' + esc(p.description) + '</textarea></label>' +
        '<label class="full">Image URL <span class="img-hint">(paste a link, or choose a photo below)</span><input name="image" id="imgUrl" value="' + (p.image && p.image.indexOf('data:') === 0 ? '' : esc(p.image)) + '" placeholder="https://..."></label>' +
        '<label class="full">Or upload a photo <span class="img-hint">(auto-shrunk to 600px)</span><input type="file" id="imgFile" accept="image/*"></label>' +
        '<div class="full"><div class="thumb" id="imgPrev" style="width:90px;height:90px">' + (p.image ? '<img src="' + esc(p.image) + '" alt="">' : esc(p.emoji)) + '</div></div>' +
        '<label class="radio"><input type="checkbox" name="featured"' + (p.featured ? ' checked' : '') + '> Featured (best seller)</label>' +
        '<label class="radio"><input type="checkbox" name="isRx"' + (p.isRx ? ' checked' : '') + '> Prescription (Rx) only</label>' +
        '<label class="radio"><input type="checkbox" name="active"' + (p.active ? ' checked' : '') + '> Visible in shop</label></div>' +
        '<button class="btn btn-primary">' + (isNew ? 'Add product' : 'Save changes') + '</button></form>';

      var uploaded = p.image && p.image.indexOf('data:') === 0 ? p.image : '';
      var prev = document.getElementById('imgPrev');
      document.getElementById('imgFile').onchange = function (e) {
        var f = e.target.files[0]; if (!f) { return; }
        resizeImage(f).then(function (d) { uploaded = d; document.getElementById('imgUrl').value = ''; prev.innerHTML = '<img src="' + d + '" alt="">'; })
          .catch(function (err) { document.getElementById('prodMsg').innerHTML = alertBox('error', err.message); });
      };
      document.getElementById('imgUrl').oninput = function (e) { if (e.target.value) { uploaded = ''; prev.innerHTML = '<img src="' + esc(e.target.value) + '" alt="">'; } };

      document.getElementById('prodForm').onsubmit = function (e) {
        e.preventDefault();
        var f = e.target, errs = [];
        var name = f.name.value.trim(), price = num(f.price.value), old = num(f.oldPrice.value), stock = num(f.stock.value);
        if (!name) { errs.push('Name is required.'); }
        if (price == null || price < 0) { errs.push('Enter a valid price.'); }
        if (old != null && old < 0) { errs.push('Old price is not valid.'); }
        if (stock == null || stock < 0 || Math.floor(stock) !== stock) { errs.push('Stock must be a whole number.'); }
        if (errs.length) { document.getElementById('prodMsg').innerHTML = alertBox('error', errs.join(' ')); return; }
        var btn = f.querySelector('button'); btn.disabled = true;
        DB.admin.saveProduct({
          slug: isNew ? '' : p.slug, createdAt: p.createdAt, name: name, categoryId: f.categoryId.value,
          description: f.description.value.trim(), genericName: f.genericName.value.trim(), price: price, oldPrice: old,
          unit: f.unit.value.trim(), emoji: f.emoji.value.trim() || '📦', image: uploaded || f.image.value.trim(),
          stock: stock, featured: f.featured.checked, isRx: f.isRx.checked, active: f.active.checked
        }).then(function () { toast('Product saved'); location.hash = '#/products'; }).catch(function (err) {
          btn.disabled = false; document.getElementById('prodMsg').innerHTML = fail(err);
        });
      };
    } catch (e) { content().innerHTML = fail(e); }
  }

  /* ---------- categories ---------- */
  async function categories(editId) {
    shell('categories', 'Categories', '<p class="loading">Loading...</p>');
    try {
      var list = await DB.admin.listCategories();
      var c = list.filter(function (x) { return x.id === editId; })[0] || { id: '', name: '', emoji: '📦', kind: 'grocery', sortOrder: 10, active: true };
      content().innerHTML = '<div id="catMsg"></div><div class="two-col"><div class="card table-wrap"><table class="table"><thead><tr><th>Name</th><th>Type</th><th>Order</th><th>Status</th><th></th></tr></thead><tbody>' +
        list.map(function (x) {
          return '<tr><td>' + esc(x.emoji) + ' ' + esc(x.name) + '</td><td>' + esc(x.kind) + '</td><td>' + x.sortOrder + '</td><td>' + (x.active ? '<span class="badge badge-ok">Active</span>' : '<span class="badge badge-out">Hidden</span>') + '</td>' +
            '<td class="actions"><a class="btn btn-sm btn-light" href="#/categories/' + encodeURIComponent(x.id) + '">Edit</a> <button class="btn btn-sm btn-danger" data-del="' + esc(x.id) + '">Delete</button></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<form class="card form-card" id="catForm"><h3>' + (c.id ? 'Edit category' : 'Add category') + '</h3>' +
        '<label>Name<input name="name" required value="' + esc(c.name) + '"></label>' +
        '<label>Emoji<input name="emoji" maxlength="8" value="' + esc(c.emoji) + '"></label>' +
        '<label>Type<select name="kind">' + opts(['grocery', 'medicine'], c.kind) + '</select></label>' +
        '<label>Sort order<input name="sortOrder" type="number" step="1" value="' + esc(c.sortOrder) + '"></label>' +
        '<label class="radio"><input type="checkbox" name="active"' + (c.active ? ' checked' : '') + '> Visible in shop</label>' +
        '<button class="btn btn-primary">Save</button>' + (c.id ? ' <a class="btn btn-light" href="#/categories">Cancel</a>' : '') + '</form></div>';
      document.getElementById('catForm').onsubmit = function (e) {
        e.preventDefault();
        var f = e.target, name = f.name.value.trim();
        if (!name) { document.getElementById('catMsg').innerHTML = alertBox('error', 'Name is required.'); return; }
        DB.admin.saveCategory({ id: c.id, name: name, emoji: f.emoji.value.trim() || '📦', kind: f.kind.value, sortOrder: Number(f.sortOrder.value) || 0, active: f.active.checked })
          .then(function () { toast('Category saved'); if (c.id) { location.hash = '#/categories'; } else { categories(); } })
          .catch(function (err) { document.getElementById('catMsg').innerHTML = fail(err); });
      };
      content().querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Delete this category?')) { return; }
          DB.admin.deleteCategory(b.getAttribute('data-del')).then(function () { toast('Deleted'); categories(); }).catch(function (err) { document.getElementById('catMsg').innerHTML = fail(err); });
        };
      });
    } catch (e) { content().innerHTML = fail(e); }
  }

  /* ---------- coupons ---------- */
  async function coupons(editCode) {
    shell('coupons', 'Coupons', '<p class="loading">Loading...</p>');
    try {
      var list = await DB.admin.listCoupons();
      var c = list.filter(function (x) { return x.code === editCode; })[0];
      var isNew = !c;
      c = c || { code: '', type: 'percent', value: 10, minOrder: 0, maxUses: null, expiresOn: '', active: true };
      content().innerHTML = '<div id="cpMsg"></div><div class="two-col"><div class="card table-wrap"><table class="table"><thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>' +
        (list.length ? list.map(function (x) {
          return '<tr><td><strong>' + esc(x.code) + '</strong></td><td>' + (x.type === 'percent' ? x.value + '%' : money(x.value)) + '</td><td>' + money(x.minOrder) + '</td><td>' + (x.usedCount || 0) + (x.maxUses != null ? ' / ' + x.maxUses : '') + '</td><td>' + esc(x.expiresOn || '-') + '</td>' +
            '<td>' + (x.active ? '<span class="badge badge-ok">Active</span>' : '<span class="badge badge-out">Off</span>') + '</td>' +
            '<td class="actions"><a class="btn btn-sm btn-light" href="#/coupons/' + encodeURIComponent(x.code) + '">Edit</a> <button class="btn btn-sm btn-danger" data-del="' + esc(x.code) + '">Delete</button></td></tr>';
        }).join('') : '<tr><td colspan="7">No coupons yet.</td></tr>') + '</tbody></table></div>' +
        '<form class="card form-card" id="cpForm"><h3>' + (isNew ? 'Add coupon' : 'Edit coupon') + '</h3>' +
        '<label>Code (letters/numbers)<input name="code" required ' + (isNew ? '' : 'readonly ') + 'value="' + esc(c.code) + '" style="text-transform:uppercase"></label>' +
        '<label>Type<select name="type">' + opts(['percent', 'fixed'], c.type, function (v) { return v === 'percent' ? 'Percent (%)' : 'Fixed amount (৳)'; }) + '</select></label>' +
        '<label>Value<input name="value" type="number" min="0" step="0.01" required value="' + esc(c.value) + '"></label>' +
        '<label>Minimum order (৳)<input name="minOrder" type="number" min="0" step="1" value="' + esc(c.minOrder || 0) + '"></label>' +
        '<label>Max uses (empty = unlimited)<input name="maxUses" type="number" min="1" step="1" value="' + esc(c.maxUses == null ? '' : c.maxUses) + '"></label>' +
        '<label>Expires on (optional)<input name="expiresOn" type="date" value="' + esc(c.expiresOn || '') + '"></label>' +
        '<label class="radio"><input type="checkbox" name="active"' + (c.active ? ' checked' : '') + '> Active</label>' +
        '<button class="btn btn-primary">Save</button>' + (isNew ? '' : ' <a class="btn btn-light" href="#/coupons">Cancel</a>') + '</form></div>';
      document.getElementById('cpForm').onsubmit = function (e) {
        e.preventDefault();
        var f = e.target, code = f.code.value.trim().toUpperCase(), type = f.type.value, value = num(f.value.value), errs = [];
        if (!/^[A-Z0-9]{3,20}$/.test(code)) { errs.push('Code must be 3-20 letters or numbers.'); }
        if (value == null || value <= 0) { errs.push('Value must be more than 0.'); }
        if (type === 'percent' && value > 100) { errs.push('Percent cannot be more than 100.'); }
        if (errs.length) { document.getElementById('cpMsg').innerHTML = alertBox('error', errs.join(' ')); return; }
        DB.admin.saveCoupon({ code: code, type: type, value: value, minOrder: num(f.minOrder.value) || 0, maxUses: num(f.maxUses.value), expiresOn: f.expiresOn.value || null, active: f.active.checked }, isNew)
          .then(function () { toast('Coupon saved'); if (isNew) { coupons(); } else { location.hash = '#/coupons'; } })
          .catch(function (err) { document.getElementById('cpMsg').innerHTML = fail(err); });
      };
      content().querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Delete this coupon?')) { return; }
          DB.admin.deleteCoupon(b.getAttribute('data-del')).then(function () { toast('Deleted'); coupons(); }).catch(function (err) { document.getElementById('cpMsg').innerHTML = fail(err); });
        };
      });
    } catch (e) { content().innerHTML = fail(e); }
  }

  /* ---------- rider applications ---------- */
  async function applications() {
    shell('applications', 'Rider applications', '<p class="loading">Loading...</p>');
    try {
      var list = await DB.admin.listApplications();
      content().innerHTML = '<div id="apMsg"></div><div class="card table-wrap">' + (list.length ?
        '<table class="table"><thead><tr><th>Date</th><th>Name</th><th>Phone</th><th>Area</th><th>Vehicle</th><th>Message</th><th>Status</th><th></th></tr></thead><tbody>' +
        list.map(function (a) {
          return '<tr><td>' + esc(DM.fmtDate(a.createdAt)) + '</td><td>' + esc(a.name) + '</td><td><a href="tel:' + esc(a.phone) + '">' + esc(a.phone) + '</a></td><td>' + esc(a.area) + '</td><td>' + esc(a.vehicle) + '</td><td>' + esc(a.message) + '</td>' +
            '<td><select data-st="' + esc(a.id) + '">' + opts(APP_STATUSES, a.status) + '</select></td><td><button class="btn btn-sm btn-danger" data-del="' + esc(a.id) + '">Delete</button></td></tr>';
        }).join('') + '</tbody></table>' : '<p style="padding:1rem">No applications yet.</p>') + '</div>';
      content().querySelectorAll('[data-st]').forEach(function (s) {
        s.onchange = function () { DB.admin.setApplicationStatus(s.getAttribute('data-st'), s.value).then(function () { toast('Status saved'); }).catch(function (err) { document.getElementById('apMsg').innerHTML = fail(err); }); };
      });
      content().querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Delete this application?')) { return; }
          DB.admin.deleteApplication(b.getAttribute('data-del')).then(function () { toast('Deleted'); applications(); }).catch(function (err) { document.getElementById('apMsg').innerHTML = fail(err); });
        };
      });
    } catch (e) { content().innerHTML = fail(e); }
  }

  /* ---------- change password ---------- */
  function password() {
    shell('password', 'Change password', '<form class="card form-card narrow" id="pwForm"><div id="pwMsg"></div>' +
      '<label>Current password<input type="password" name="current" required autocomplete="current-password"></label>' +
      '<label>New password (min 6 characters)<input type="password" name="next" required autocomplete="new-password"></label>' +
      '<label>Confirm new password<input type="password" name="confirm" required autocomplete="new-password"></label>' +
      '<button class="btn btn-primary">Change password</button></form>');
    document.getElementById('pwForm').onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, msg = document.getElementById('pwMsg');
      if (f.next.value.length < 6) { msg.innerHTML = alertBox('error', 'New password must be at least 6 characters.'); return; }
      if (f.next.value !== f.confirm.value) { msg.innerHTML = alertBox('error', 'The two new passwords do not match.'); return; }
      DB.changePassword(f.current.value, f.next.value).then(function () { f.reset(); msg.innerHTML = alertBox('success', 'Password changed.'); })
        .catch(function (err) { msg.innerHTML = fail(err); });
    };
  }

  /* ---------- router ---------- */
  async function render() {
    document.body.classList.remove('invoice-body');
    try { ME = await DB.authReady(); } catch (e) { ME = null; }
    if (!ME) { loginScreen(); return; }
    if (!ME.isAdmin) { notAdminScreen(); return; }
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    var page = parts[0] || 'dashboard';
    var arg = parts[1] ? decodeURIComponent(parts[1]) : '';
    switch (page) {
      case 'orders':       return orders(arg);
      case 'order':        return orderView(arg);
      case 'invoice':      return invoice(arg);
      case 'products':     return products();
      case 'product':      return productForm(arg || 'new');
      case 'categories':   return categories(arg);
      case 'coupons':      return coupons(arg);
      case 'applications': return applications();
      case 'password':     return password();
      default:             return dashboard();
    }
  }
  window.addEventListener('hashchange', render);
  render();
})();
