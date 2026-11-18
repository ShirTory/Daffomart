/* =====================================================================
   DaffoMart  -  demo-sdk.js
   A tiny FAKE of the Firebase SDK that keeps everything in the browser (localStorage).
   It is used only while config.js still has the "PASTE_..." placeholder, so you can try the
   whole shop and admin panel before you create a Firebase project.
   It has the same function names as the real Firebase SDK (doc, getDoc, setDoc, runTransaction ...),
   so db.js runs the SAME code in demo mode and with real Firebase.
   NOTE: demo mode has no security rules and the demo admin password is not protected. Never use it live.
   ===================================================================== */
(function () {
  var DATA_KEY = 'dm_demo_firestore';
  var USERS_KEY = 'dm_demo_users';
  var SESSION_KEY = 'dm_demo_session';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (e) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function denied() { var e = new Error('Missing or insufficient permissions.'); e.code = 'permission-denied'; return e; }

  /* ----- references and snapshots ----- */
  function snapshot(col, id, data) {
    return {
      id: id,
      exists: function () { return data !== undefined; },
      data: function () { return clone(data); }
    };
  }

  var sdk = {
    initializeApp: function () { return {}; },
    getFirestore: function () { return {}; },
    getAuth: function () { return auth; },

    collection: function (fs, name) { return { type: 'collection', name: name }; },
    doc: function (fs, name, id) { return { type: 'doc', name: name, id: String(id) }; },
    where: function (field, op, value) { return { field: field, op: op, value: value }; },
    query: function (col) {
      return { type: 'query', name: col.name, wheres: Array.prototype.slice.call(arguments, 1) };
    },

    getDoc: function (ref) {
      var db = read(DATA_KEY, {});
      var row = db[ref.name] && db[ref.name][ref.id];
      return Promise.resolve(snapshot(ref.name, ref.id, row));
    },
    getDocs: function (q) {
      var db = read(DATA_KEY, {});
      var rows = db[q.name] || {};
      var wheres = q.wheres || [];
      var docs = Object.keys(rows).filter(function (id) {
        return wheres.every(function (w) { return rows[id][w.field] === w.value; });
      }).map(function (id) { return snapshot(q.name, id, rows[id]); });
      return Promise.resolve({
        docs: docs,
        size: docs.length,
        empty: docs.length === 0,
        forEach: function (fn) { docs.forEach(fn); }
      });
    },
    setDoc: function (ref, data) {
      var db = read(DATA_KEY, {});
      db[ref.name] = db[ref.name] || {};
      db[ref.name][ref.id] = clone(data);
      write(DATA_KEY, db);
      return Promise.resolve();
    },
    updateDoc: function (ref, patch) {
      var db = read(DATA_KEY, {});
      if (!db[ref.name] || !db[ref.name][ref.id]) { var e = new Error('No document to update'); e.code = 'not-found'; return Promise.reject(e); }
      Object.assign(db[ref.name][ref.id], clone(patch));
      write(DATA_KEY, db);
      return Promise.resolve();
    },
    deleteDoc: function (ref) {
      var db = read(DATA_KEY, {});
      if (db[ref.name]) { delete db[ref.name][ref.id]; write(DATA_KEY, db); }
      return Promise.resolve();
    },

    // Writes are collected and saved only if the function finishes without an error (all or nothing).
    runTransaction: function (fs, fn) {
      var db = read(DATA_KEY, {});
      var queue = [];
      var tx = {
        get: function (ref) {
          var row = db[ref.name] && db[ref.name][ref.id];
          return Promise.resolve(snapshot(ref.name, ref.id, row));
        },
        set: function (ref, data) { queue.push(['set', ref, clone(data)]); return tx; },
        update: function (ref, patch) { queue.push(['update', ref, clone(patch)]); return tx; },
        delete: function (ref) { queue.push(['delete', ref]); return tx; }
      };
      return Promise.resolve(fn(tx)).then(function (result) {
        var fresh = read(DATA_KEY, {});
        queue.forEach(function (op) {
          var ref = op[1];
          fresh[ref.name] = fresh[ref.name] || {};
          if (op[0] === 'set') { fresh[ref.name][ref.id] = op[2]; }
          if (op[0] === 'update') { Object.assign(fresh[ref.name][ref.id] || (fresh[ref.name][ref.id] = {}), op[2]); }
          if (op[0] === 'delete') { delete fresh[ref.name][ref.id]; }
        });
        write(DATA_KEY, fresh);
        return result;
      });
    }
  };

  /* ----- fake login (Firebase Auth) ----- */
  var listeners = [];
  var auth = { currentUser: read(SESSION_KEY, null) };

  function users() { return read(USERS_KEY, []); }
  function authError(code) { var e = new Error(code); e.code = code; return e; }
  function setCurrent(u) {
    auth.currentUser = u ? { uid: u.uid, email: u.email } : null;
    write(SESSION_KEY, auth.currentUser);
    listeners.forEach(function (cb) { cb(auth.currentUser); });
  }

  sdk.onAuthStateChanged = function (a, cb) {
    listeners.push(cb);
    setTimeout(function () { cb(auth.currentUser); }, 0);
    return function () { listeners = listeners.filter(function (x) { return x !== cb; }); };
  };
  sdk.createUserWithEmailAndPassword = function (a, email, password) {
    var list = users();
    email = String(email).toLowerCase();
    if (list.some(function (u) { return u.email === email; })) { return Promise.reject(authError('auth/email-already-in-use')); }
    var u = { uid: 'u' + Math.random().toString(36).slice(2, 12), email: email, password: password };
    list.push(u);
    write(USERS_KEY, list);
    setCurrent(u);
    return Promise.resolve({ user: auth.currentUser });
  };
  sdk.signInWithEmailAndPassword = function (a, email, password) {
    email = String(email).toLowerCase();
    var u = users().filter(function (x) { return x.email === email && x.password === password; })[0];
    if (!u) { return Promise.reject(authError('auth/invalid-credential')); }
    setCurrent(u);
    return Promise.resolve({ user: auth.currentUser });
  };
  sdk.signOut = function () { setCurrent(null); return Promise.resolve(); };
  sdk.EmailAuthProvider = { credential: function (email, password) { return { email: String(email).toLowerCase(), password: password }; } };
  sdk.reauthenticateWithCredential = function (user, cred) {
    var ok = users().some(function (u) { return u.uid === user.uid && u.password === cred.password; });
    return ok ? Promise.resolve() : Promise.reject(authError('auth/invalid-credential'));
  };
  sdk.updatePassword = function (user, password) {
    var list = users();
    list.forEach(function (u) { if (u.uid === user.uid) { u.password = password; } });
    write(USERS_KEY, list);
    return Promise.resolve();
  };

  // used once by db.js to create the demo admin: admin@daffomart.test / admin123
  sdk.__ensureDemoAdmin = function () {
    var list = users();
    if (!list.some(function (u) { return u.uid === 'demo-admin'; })) {
      list.push({ uid: 'demo-admin', email: 'admin@daffomart.test', password: 'admin123' });
      write(USERS_KEY, list);
    }
    return 'demo-admin';
  };
  sdk.__reset = function () {
    [DATA_KEY, USERS_KEY, SESSION_KEY].forEach(function (k) { localStorage.removeItem(k); });
  };

  window.DM_DEMO_SDK = sdk;
})();
