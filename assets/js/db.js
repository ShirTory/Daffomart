/* =====================================================================
   DaffoMart  -  db.js   (the DATA LAYER: all talking to Firebase happens only here)
   Replaces includes/db.php + the SQL queries of the PHP version.

   Firebase Auth      -> login / register           (customers and admin)
   Cloud Firestore    -> collections:
       categories/{slug}   products/{slug}   coupons/{CODE}   orders/{key}
       applications/{phone}   users/{uid}   admins/{uid}

   Pages never use Firebase directly. They only call  DM.db.something()  from this file.
   With a real Firebase config the real SDK is loaded from Google's CDN.
   Without it (DEMO MODE) demo-sdk.js is used, which has the same function names.
   ===================================================================== */
(function () {
  var DM = window.DM;
  var cfg = DM.cfg;
  var FB_VERSION = '10.14.1';
  var DEMO = !cfg.firebase || !cfg.firebase.apiKey || /^PASTE/i.test(cfg.firebase.apiKey);

  var sdk, auth, fs;           // set by ready()
  var DB = {};
  DM.db = DB;
  DB.demo = DEMO;

  /* ---------- start-up ---------- */
  var readyPromise = (async function () {
    if (DEMO) {
      sdk = window.DM_DEMO_SDK;
    } else {
      var base = 'https://www.gstatic.com/firebasejs/' + FB_VERSION + '/';
      var mods = await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-auth.js'),
        import(base + 'firebase-firestore.js')
      ]);
      sdk = Object.assign({}, mods[0], mods[1], mods[2]);
    }
    var app = sdk.initializeApp(cfg.firebase);
    auth = sdk.getAuth(app);
    fs = sdk.getFirestore(app);
    if (DEMO) { await seedDemo(); }
  })();
  DB.ready = readyPromise;

  // first start of demo mode: sample products + a demo admin (admin@daffomart.test / admin123)
  async function seedDemo() {
    var cats = await sdk.getDocs(sdk.collection(fs, 'categories'));
    if (cats.empty && !localStorage.getItem('dm_demo_seeded')) {
      var uid = sdk.__ensureDemoAdmin();
      await sdk.setDoc(sdk.doc(fs, 'admins', uid), { role: 'admin' });
      await seedSampleNow();
      localStorage.setItem('dm_demo_seeded', '1');
    }
  }

  function list(snap) {
    var out = [];
    snap.forEach(function (d) { out.push(Object.assign({ id: d.id }, d.data())); });
    return out;
  }

  // Firebase errors -> friendly text
  DB.errorText = function (e) {
    var code = (e && e.code) || '';
    var map = {
      'auth/invalid-credential': 'Wrong email or password.',
      'auth/wrong-password': 'Wrong email or password.',
      'auth/user-not-found': 'Wrong email or password.',
      'auth/invalid-email': 'Please enter a valid email.',
      'auth/email-already-in-use': 'This email is already registered. Please login.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/too-many-requests': 'Too many tries. Please wait a few minutes and try again.',
      'auth/network-request-failed': 'No internet connection. Please try again.',
      'permission-denied': 'Not allowed. Check your Firestore rules (see README).',
      'unavailable': 'Cannot reach the server. Please check your internet.'
    };
    if (e && e.orderProblem) { return e.message; }
    return map[code] || (e && e.message) || 'Something went wrong. Please try again.';
  };

  function problem(message) { var e = new Error(message); e.orderProblem = true; return e; }

  /* =====================================================================
     1. LOGIN  (Firebase Auth)
     user = { uid, email, name, phone, isAdmin }   or null when logged out
     ===================================================================== */
  var currentUser = null;
  var authKnown = false;
  var authListeners = [];
  var authResolvers = [];

  async function buildUser(fbUser) {
    if (!fbUser) { return null; }
    var user = { uid: fbUser.uid, email: fbUser.email || '', name: '', phone: '', isAdmin: false };
    try {
      var p = await sdk.getDoc(sdk.doc(fs, 'users', fbUser.uid));
      if (p.exists()) { user.name = p.data().name || ''; user.phone = p.data().phone || ''; }
    } catch (e) { /* profile is optional */ }
    try {
      // a user is an admin only if the document admins/<uid> exists (you create it by hand, see README)
      var a = await sdk.getDoc(sdk.doc(fs, 'admins', fbUser.uid));
      user.isAdmin = a.exists();
    } catch (e) { /* not an admin */ }
    return user;
  }

  function publish(user) {
    currentUser = user;
    authKnown = true;
    authListeners.forEach(function (cb) { cb(user); });
    authResolvers.splice(0).forEach(function (r) { r(user); });
  }

  readyPromise.then(function () {
    sdk.onAuthStateChanged(auth, async function (fbUser) { publish(await buildUser(fbUser)); });
  }).catch(function (e) {
    console.error('Firebase could not start:', e);
    publish(null);
  });

  // resolves with the user (or null) after Firebase has told us who is logged in
  DB.authReady = function () {
    return authKnown ? Promise.resolve(currentUser) : new Promise(function (r) { authResolvers.push(r); });
  };
  DB.user = function () { return currentUser; };
  DB.onAuth = function (cb) {
    authListeners.push(cb);
    if (authKnown) { cb(currentUser); }
  };

  DB.register = async function (data) {
    await readyPromise;
    var cred = await sdk.createUserWithEmailAndPassword(auth, data.email, data.password);
    var uid = cred.user.uid;
    await sdk.setDoc(sdk.doc(fs, 'users', uid), { name: data.name, email: data.email, phone: data.phone, createdAt: Date.now() });
    publish(await buildUser(auth.currentUser));
  };
  DB.login = async function (email, password) {
    await readyPromise;
    var cred = await sdk.signInWithEmailAndPassword(auth, email, password);
    var user = await buildUser(cred.user);
    publish(user);
    return user;
  };
  DB.logout = async function () { await readyPromise; await sdk.signOut(auth); };
  DB.changePassword = async function (current, next) {
    await readyPromise;
    var u = auth.currentUser;
    await sdk.reauthenticateWithCredential(u, sdk.EmailAuthProvider.credential(u.email, current));
    await sdk.updatePassword(u, next);
  };

  /* =====================================================================
     2. SHOP DATA (public)  - categories + products + coupons
     The catalog is small, so we read it once and keep it for 60 seconds in sessionStorage.
     Only ACTIVE items are asked for (the security rules also hide hidden items from visitors).
     ===================================================================== */
  var CACHE_KEY = 'dm_catalog_v1';
  var CACHE_MS = 60000;

  DB.clearCache = function () { try { sessionStorage.removeItem(CACHE_KEY); } catch (e) { /* ignore */ } };

  DB.getCatalog = async function () {
    try {
      var hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (hit && Date.now() - hit.at < CACHE_MS) { return hit.data; }
    } catch (e) { /* no cache */ }

    await readyPromise;
    var results = await Promise.all([
      sdk.getDocs(sdk.query(sdk.collection(fs, 'categories'), sdk.where('active', '==', true))),
      sdk.getDocs(sdk.query(sdk.collection(fs, 'products'), sdk.where('active', '==', true)))
    ]);
    var categories = list(results[0]).sort(function (a, b) {
      return (a.sortOrder - b.sortOrder) || String(a.name).localeCompare(b.name);
    });
    var byId = {};
    categories.forEach(function (c) { byId[c.id] = c; });
    // a product whose category is hidden (or deleted) is not shown either
    var products = list(results[1]).filter(function (p) { return byId[p.categoryId]; })
      .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    var data = { categories: categories, products: products };
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: data })); } catch (e) { /* too big: skip cache */ }
    return data;
  };

  DB.getCoupon = async function (code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) { return null; }
    await readyPromise;
    try {
      var snap = await sdk.getDoc(sdk.doc(fs, 'coupons', code));
      return snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null;
    } catch (e) { return null; }
  };

  /* =====================================================================
     3. ORDERS
     The id of an order document is a SECRET KEY = SHA-256(orderNo + phone).
     Only someone who knows BOTH the order number and the phone number can open it
     (that is how "Track order" works without any server).
     ===================================================================== */
  async function orderKey(orderNo, phone) {
    var text = String(orderNo).trim().toUpperCase() + '|' + String(phone).trim();
    if (window.crypto && crypto.subtle) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    // very old browser / plain file:// page: simple fallback hash
    var h1 = 5381, h2 = 52711;
    for (var i = 0; i < text.length; i++) { h1 = (h1 * 33) ^ text.charCodeAt(i); h2 = (h2 * 33) ^ text.charCodeAt(i); }
    return 'x' + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  function makeOrderNo() {
    var d = new Date();
    var ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    return 'DM' + ymd + '-' + (1000 + Math.floor(Math.random() * 9000));
  }

  // input = { name, phone, address, area, note, couponCode, items: [{ slug, qty }] }
  // Everything happens in ONE transaction: re-check stock + coupon, save the order, reduce stock.
  // It all succeeds together, or nothing is saved.
  DB.placeOrder = async function (input) {
    await readyPromise;
    var user = await DB.authReady();

    for (var attempt = 0; attempt < 5; attempt++) {
      var orderNo = makeOrderNo();
      var key = await orderKey(orderNo, input.phone);
      try {
        return await sdk.runTransaction(fs, async function (tx) {
          var orderRef = sdk.doc(fs, 'orders', key);
          if ((await tx.get(orderRef)).exists()) { throw { retry: true }; }   // same number twice: try another

          // 1) read fresh product data (prices come from the database, never from the browser)
          var sub = 0;
          var items = [];
          var updates = [];
          for (var i = 0; i < input.items.length; i++) {
            var line = input.items[i];
            var ref = sdk.doc(fs, 'products', line.slug);
            var snap = await tx.get(ref);
            var p = snap.exists() ? snap.data() : null;
            if (!p || !p.active || p.stock < line.qty) {
              throw problem('Sorry, "' + (p ? p.name : line.slug) + '" is no longer available in that quantity. Please update your cart.');
            }
            var lineTotal = p.price * line.qty;
            sub += lineTotal;
            items.push({ slug: line.slug, name: p.name, unitPrice: p.price, qty: line.qty, lineTotal: lineTotal });
            updates.push({ ref: ref, stock: p.stock - line.qty });
          }

          // 2) coupon (checked again here)
          var discount = 0;
          var couponCode = null;
          var couponUpdate = null;
          if (input.couponCode) {
            var cref = sdk.doc(fs, 'coupons', input.couponCode);
            var csnap = await tx.get(cref);
            var c = csnap.exists() ? csnap.data() : null;
            var why = DM.couponProblem(c, sub);
            if (why) { throw problem('Your coupon was removed because: ' + why + ' Please check the total and place the order again.'); }
            discount = DM.couponAmount(c, sub);
            couponCode = c.code;
            couponUpdate = { ref: cref, usedCount: (c.usedCount || 0) + 1 };
          }

          var delivery = DM.deliveryCharge(input.area, sub);
          var order = {
            orderNo: orderNo,
            uid: user ? user.uid : null,
            customerName: input.name,
            phone: input.phone,
            address: input.address,
            area: input.area,
            note: input.note || '',
            items: items,
            subtotal: sub,
            couponCode: couponCode,
            discount: discount,
            deliveryCharge: delivery,
            total: sub - discount + delivery,
            paymentMethod: 'cod',
            status: 'pending',
            createdAt: Date.now()
          };

          // 3) all reads are done: now write
          tx.set(orderRef, order);
          updates.forEach(function (u) { tx.update(u.ref, { stock: u.stock }); });
          if (couponUpdate) { tx.update(couponUpdate.ref, { usedCount: couponUpdate.usedCount }); }
          return { orderNo: orderNo, key: key };
        });
      } catch (e) {
        if (e && e.retry) { continue; }
        if (e && e.code === 'permission-denied') { throw problem('Sorry, an item in your cart is no longer available. Please update your cart.'); }
        throw e;
      }
    }
    throw problem('Could not create an order number. Please try again.');
  };

  DB.getOrder = async function (key) {
    await readyPromise;
    var snap = await sdk.getDoc(sdk.doc(fs, 'orders', key));
    return snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null;
  };

  DB.findOrder = async function (orderNo, phone) {
    return DB.getOrder(await orderKey(orderNo, phone));
  };

  DB.myOrders = async function (uid) {
    await readyPromise;
    var snap = await sdk.getDocs(sdk.query(sdk.collection(fs, 'orders'), sdk.where('uid', '==', uid)));
    return list(snap).sort(function (a, b) { return b.createdAt - a.createdAt; });
  };

  /* =====================================================================
     4. RIDER APPLICATIONS (public form)
     The document id is the phone number, so one phone = one application.
     ===================================================================== */
  DB.submitApplication = async function (a) {
    await readyPromise;
    var ref = sdk.doc(fs, 'applications', a.phone);
    var exists = false;
    if (DEMO) { exists = (await sdk.getDoc(ref)).exists(); }   // demo mode has no security rules, so we check by hand
    try {
      if (exists) { throw { code: 'permission-denied' }; }
      // with real Firebase the rules refuse to overwrite an existing application
      await sdk.setDoc(ref, { name: a.name, phone: a.phone, area: a.area, vehicle: a.vehicle, message: a.message || '', status: 'new', createdAt: Date.now() });
    } catch (e) {
      if (e && e.code === 'permission-denied') { throw problem('We already have an application from this number. We will call you soon.'); }
      throw e;
    }
  };

  /* =====================================================================
     5. ADMIN functions (the security rules allow these only for admins)
     ===================================================================== */
  var A = DB.admin = {};

  A.listOrders = async function () {
    await readyPromise;
    return list(await sdk.getDocs(sdk.collection(fs, 'orders'))).sort(function (a, b) { return b.createdAt - a.createdAt; });
  };
  A.listProducts = async function () {
    await readyPromise;
    return list(await sdk.getDocs(sdk.collection(fs, 'products'))).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  };
  A.listCategories = async function () {
    await readyPromise;
    return list(await sdk.getDocs(sdk.collection(fs, 'categories'))).sort(function (a, b) {
      return (a.sortOrder - b.sortOrder) || String(a.name).localeCompare(b.name);
    });
  };
  A.listCoupons = async function () {
    await readyPromise;
    return list(await sdk.getDocs(sdk.collection(fs, 'coupons'))).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  };
  A.listApplications = async function () {
    await readyPromise;
    var rows = list(await sdk.getDocs(sdk.collection(fs, 'applications')));
    return rows.sort(function (a, b) {
      return ((b.status === 'new') - (a.status === 'new')) || (b.createdAt - a.createdAt);
    });
  };

  // Change an order status. Cancelling gives the stock (and the coupon use) back.
  A.setOrderStatus = async function (key, status) {
    await readyPromise;
    await sdk.runTransaction(fs, async function (tx) {
      var oref = sdk.doc(fs, 'orders', key);
      var osnap = await tx.get(oref);
      if (!osnap.exists()) { throw problem('Order not found.'); }
      var order = osnap.data();
      if (order.status === 'cancelled') { throw problem('A cancelled order cannot be changed.'); }
      if (order.status === status) { return; }

      var stockBack = [];
      var coupon = null;
      if (status === 'cancelled') {
        for (var i = 0; i < order.items.length; i++) {
          var pref = sdk.doc(fs, 'products', order.items[i].slug);
          var psnap = await tx.get(pref);
          if (psnap.exists()) { stockBack.push({ ref: pref, stock: psnap.data().stock + order.items[i].qty }); }   // deleted products are skipped
        }
        if (order.couponCode) {
          var cref = sdk.doc(fs, 'coupons', order.couponCode);
          var csnap = await tx.get(cref);
          if (csnap.exists()) { coupon = { ref: cref, usedCount: Math.max((csnap.data().usedCount || 0) - 1, 0) }; }
        }
      }
      stockBack.forEach(function (s) { tx.update(s.ref, { stock: s.stock }); });
      if (coupon) { tx.update(coupon.ref, { usedCount: coupon.usedCount }); }
      tx.update(oref, { status: status });
    });
    DB.clearCache();
  };

  // product = { slug (empty for a new one), name, categoryId, ... }. Returns the slug.
  A.saveProduct = async function (p) {
    await readyPromise;
    var slug = p.slug;
    var isNew = !slug;
    if (isNew) {
      slug = DM.slugify(p.name);
      if ((await sdk.getDoc(sdk.doc(fs, 'products', slug))).exists()) { slug += '-' + (100 + Math.floor(Math.random() * 900)); }
    }
    var data = {
      name: p.name, slug: slug, categoryId: p.categoryId, description: p.description, genericName: p.genericName,
      price: p.price, oldPrice: p.oldPrice, unit: p.unit, emoji: p.emoji, image: p.image || '',
      stock: p.stock, featured: !!p.featured, isRx: !!p.isRx, active: !!p.active,
      createdAt: isNew ? Date.now() : p.createdAt
    };
    await sdk.setDoc(sdk.doc(fs, 'products', slug), data);
    DB.clearCache();
    return slug;
  };
  A.deleteProduct = async function (slug) {
    await readyPromise;
    await sdk.deleteDoc(sdk.doc(fs, 'products', slug));   // old orders keep the product name
    DB.clearCache();
  };

  A.saveCategory = async function (c) {
    await readyPromise;
    var id = c.id;
    if (!id) {
      id = DM.slugify(c.name);
      if ((await sdk.getDoc(sdk.doc(fs, 'categories', id))).exists()) { id += '-' + (100 + Math.floor(Math.random() * 900)); }
    }
    await sdk.setDoc(sdk.doc(fs, 'categories', id), {
      name: c.name, slug: id, emoji: c.emoji, kind: c.kind, sortOrder: c.sortOrder, active: !!c.active
    });
    DB.clearCache();
  };
  A.deleteCategory = async function (id) {
    await readyPromise;
    var inUse = await sdk.getDocs(sdk.query(sdk.collection(fs, 'products'), sdk.where('categoryId', '==', id)));
    if (!inUse.empty) { throw problem('This category has products. Move or delete the products first.'); }
    await sdk.deleteDoc(sdk.doc(fs, 'categories', id));
    DB.clearCache();
  };

  // coupon = { code, type, value, minOrder, maxUses, expiresOn, active }. isNew stops overwriting an existing code.
  A.saveCoupon = async function (c, isNew) {
    await readyPromise;
    var ref = sdk.doc(fs, 'coupons', c.code);
    var old = await sdk.getDoc(ref);
    if (isNew && old.exists()) { throw problem('This code already exists.'); }
    var prev = old.exists() ? old.data() : {};
    await sdk.setDoc(ref, {
      code: c.code, type: c.type, value: c.value, minOrder: c.minOrder, maxUses: c.maxUses, expiresOn: c.expiresOn,
      active: !!c.active, usedCount: prev.usedCount || 0, createdAt: prev.createdAt || Date.now()
    });
  };
  A.deleteCoupon = async function (code) { await readyPromise; await sdk.deleteDoc(sdk.doc(fs, 'coupons', code)); };

  A.setApplicationStatus = async function (id, status) { await readyPromise; await sdk.updateDoc(sdk.doc(fs, 'applications', id), { status: status }); };
  A.deleteApplication = async function (id) { await readyPromise; await sdk.deleteDoc(sdk.doc(fs, 'applications', id)); };

  // writes the sample categories, products and coupons (button on the admin dashboard)
  DB.seedSample = async function () { await readyPromise; return seedSampleNow(); };

  // (separate function, so demo start-up can call it without waiting for itself)
  async function seedSampleNow() {
    if (!window.DM_SAMPLE) { await DM.loadScript(DM.jsBase + 'sample-data.js'); }
    var S = window.DM_SAMPLE;
    var now = Date.now();
    for (var i = 0; i < S.categories.length; i++) {
      var c = S.categories[i];
      await sdk.setDoc(sdk.doc(fs, 'categories', c.id), { name: c.name, slug: c.id, emoji: c.emoji, kind: c.kind, sortOrder: c.sortOrder, active: true });
    }
    for (var j = 0; j < S.products.length; j++) {
      var r = S.products[j];
      var desc = r[3] ? r[1] + ' - genuine medicine/health product. Please read the label and use as directed.'
                      : 'Fresh, quality-checked ' + r[1].toLowerCase() + ' delivered to your door.';
      await sdk.setDoc(sdk.doc(fs, 'products', r[2]), {
        name: r[1], slug: r[2], categoryId: r[0], description: desc, genericName: r[3], price: r[4], oldPrice: r[5],
        unit: r[6], emoji: r[7], image: '', stock: r[8], featured: !!r[9], isRx: !!r[10], active: true, createdAt: now - j * 1000
      });
    }
    for (var k = 0; k < S.coupons.length; k++) {
      var cp = S.coupons[k];
      await sdk.setDoc(sdk.doc(fs, 'coupons', cp.code), {
        code: cp.code, type: cp.type, value: cp.value, minOrder: cp.minOrder, maxUses: cp.maxUses, expiresOn: null, active: true, usedCount: 0, createdAt: now
      });
    }
    DB.clearCache();
  }

  // for the admin page: show the current Firebase user's uid (needed to make the first admin)
  DB.rawUid = function () { return auth && auth.currentUser ? auth.currentUser.uid : ''; };
})();
