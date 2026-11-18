/* =====================================================================
   DaffoMart  -  core.js   (plain JavaScript, no libraries)
   Small helpers and the shop RULES (money, delivery, coupons).
   This file has no screen code: it is shared by the shop pages and the admin panel.
   Everything is stored on one global object called DM.
   ===================================================================== */
(function () {
  var DM = window.DM = window.DM || {};
  DM.cfg = window.DM_CONFIG;

  // folder of the js files, e.g. "https://site/assets/js/" (works from the shop and from /admin/)
  var me = document.currentScript;
  DM.jsBase = me ? me.src.replace(/core\.js.*$/, '') : 'assets/js/';
  DM.assets = DM.jsBase.replace(/js\/$/, '');          // ".../assets/"

  /* ---------- text helpers ---------- */

  // Escape text before putting it into HTML (stops XSS). Use it for EVERY value from users or the database.
  DM.esc = function (text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // 1250 -> "৳1,250"   12.5 -> "৳12.50"
  DM.money = function (amount) {
    var n = Number(amount) || 0;
    var whole = Math.floor(n) === n;
    return '৳' + n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  };

  DM.slugify = function (text) {
    var s = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'item';
  };

  // read ?name=value from the address bar
  DM.param = function (name) {
    return new URLSearchParams(location.search).get(name) || '';
  };

  // timestamp (milliseconds) -> "17 Nov 2026, 09:30 PM"
  DM.fmtDate = function (ms, withTime) {
    if (!ms) { return '-'; }
    var d = new Date(ms);
    var opts = { day: '2-digit', month: 'short', year: 'numeric' };
    if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; opts.hour12 = true; }
    return d.toLocaleString('en-GB', opts);
  };

  DM.today = function () {            // "2026-11-17" in the local time zone
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  DM.statusLabel = function (s) {
    var labels = { pending: 'Pending', confirmed: 'Confirmed', shipped: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' };
    return labels[s] || s;
  };

  DM.isPhone = function (v) { return /^01[3-9][0-9]{8}$/.test(String(v || '').trim()); };

  // load another js file when needed (returns a Promise)
  DM.loadScript = function (src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  };

  /* ---------- shop rules (same rules as functions.php in the PHP version) ---------- */

  DM.deliveryCharge = function (area, subtotal) {
    var d = DM.cfg.delivery;
    if (d.freeOver > 0 && subtotal >= d.freeOver) { return 0; }
    return Number(area === 'outside' ? d.outside : d.inside);
  };

  // Checks a coupon against all rules. Returns '' when it is fine, or the reason text.
  DM.couponProblem = function (c, subtotal) {
    if (!c || !c.active)                                        { return 'This coupon code is not valid.'; }
    if (c.expiresOn && c.expiresOn < DM.today())                { return 'This coupon has expired.'; }
    if (c.maxUses != null && (c.usedCount || 0) >= c.maxUses)   { return 'This coupon has already been fully used.'; }
    if (subtotal < (c.minOrder || 0))                           { return 'Minimum order for this coupon is ' + DM.money(c.minOrder) + '.'; }
    return '';
  };

  // how many Taka this coupon takes off
  DM.couponAmount = function (c, subtotal) {
    var off = c.type === 'percent' ? subtotal * Number(c.value) / 100 : Number(c.value);
    return Math.round(Math.min(off, subtotal) * 100) / 100;
  };

  // all money numbers in one place
  DM.totals = function (subtotal, area, coupon) {
    var discount = coupon ? DM.couponAmount(coupon, subtotal) : 0;
    var delivery = DM.deliveryCharge(area || 'inside', subtotal);
    return { subtotal: subtotal, discount: discount, coupon: coupon || null, delivery: delivery, total: subtotal - discount + delivery };
  };
})();
