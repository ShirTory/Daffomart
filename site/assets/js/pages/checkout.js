/* Checkout: customer details, delivery area, payment method, coupon -> POST /orders. */
DM.ready(function (st) {
  var esc = DM.esc, box = document.getElementById('checkoutBox'), S = st.settings;
  var zones = st.zones, pays = st.paymentOptions.filter(function (o) { return !o.disabled; }), disabledPays = st.paymentOptions.filter(function (o) { return o.disabled; });
  var saved = DM.load('dm_customer', {});
  DM.cartLines().then(function (r) {
    if (!r.lines.length) { box.innerHTML = '<div class="empty"><p>Your cart is empty.</p><a class="btn btn-primary" href="/products.html">Start shopping</a></div>'; return; }
    var code = DM.coupon.get(), cp = null, zone = zones[0], pay = pays[0];
    function isManual(o) { return o && ['cod', 'online'].indexOf(o.id) === -1 && o.requireTrx !== false; }
    function totals() {
      var disc = cp ? cp.discount : 0, free = zone.freeOver > 0 && r.subtotal - disc >= zone.freeOver;
      var delivery = free ? 0 : zone.charge, svc = Number(S.serviceCharge) || 0;
      return { disc: disc, delivery: delivery, svc: svc, total: r.subtotal - disc + delivery + svc };
    }
    function summary() {
      var t = totals();
      document.getElementById('sum').innerHTML = r.lines.map(function (l) { return '<div class="row"><span>' + esc(l.product.name) + (l.variant ? ' <small class="muted">(' + esc(DM.variantLabel(l.variant)) + ')</small>' : '') + ' × ' + l.qty + '</span><span>' + DM.money(l.total) + '</span></div>'; }).join('') +
        '<hr><div class="row"><span>Subtotal</span><span>' + DM.money(r.subtotal) + '</span></div>' + (t.disc ? '<div class="row discount"><span>Coupon ' + esc(cp.code) + '</span><span>−' + DM.money(t.disc) + '</span></div>' : '') +
        '<div class="row"><span>Delivery (' + esc(zone.name) + ')</span><span>' + (t.delivery ? DM.money(t.delivery) : 'Free') + '</span></div>' + (t.svc ? '<div class="row"><span>Service charge</span><span>' + DM.money(t.svc) + '</span></div>' : '') +
        '<div class="row total"><strong>Total</strong><strong>' + DM.money(t.total) + '</strong></div>';
    }
    function payExtra() {
      var x = document.getElementById('payExtra');
      if (!isManual(pay)) { x.innerHTML = pay && pay.id === 'cod' ? '' : ''; return; }
      x.innerHTML = '<div class="alert alert-info">' + esc(S.payInstructions || '') + (pay.number ? '<br>Send to: <strong>' + esc(pay.number) + '</strong>' : '') + '</div>' +
        '<label>Transaction ID (TrxID)<input name="paymentRef" maxlength="40" autocomplete="off"></label><label>Number you paid from<input name="paymentFrom" type="tel" placeholder="01XXXXXXXXX"></label>';
    }
    box.innerHTML = '<div class="cart-layout"><form id="coForm" class="card form-card" novalidate>' +
      '<label>Full name<input name="name" value="' + esc(saved.name || '') + '" maxlength="80"></label>' +
      '<label>Mobile number<input name="phone" type="tel" placeholder="01XXXXXXXXX" value="' + esc(saved.phone || '') + '"></label>' +
      '<label>Full address<textarea name="address" rows="3" maxlength="300">' + esc(saved.address || '') + '</textarea></label>' +
      '<fieldset><legend>Delivery area</legend>' + zones.map(function (z, i) { return '<label class="radio"><input type="radio" name="zone" value="' + esc(z.id) + '"' + (i ? '' : ' checked') + '> ' + esc(z.name) + ' — ' + DM.money(z.charge) + (z.eta ? ' <small class="muted">(' + esc(z.eta) + ')</small>' : '') + '</label>'; }).join('') +
        (S.courierOutsideNote ? '<p class="muted small" id="zoneNote"></p>' : '') + '</fieldset>' +
      '<fieldset><legend>Payment</legend>' + pays.map(function (o, i) { return '<label class="radio"><input type="radio" name="payment" value="' + esc(o.id) + '"' + (i ? '' : ' checked') + '> ' + esc(o.icon || '') + ' <strong>' + esc(o.label) + '</strong> <small class="muted">' + esc(o.hint || '') + '</small></label>'; }).join('') +
        disabledPays.map(function (o) { return '<label class="radio off"><input type="radio" disabled> ' + esc(o.label) + ' <small class="muted">' + esc(o.hint || '') + '</small></label>'; }).join('') + '<div id="payExtra"></div></fieldset>' +
      '<label>Note (optional)<textarea name="note" rows="2" maxlength="300"></textarea></label><div id="coMsg"></div>' +
      '<button class="btn btn-primary btn-block" id="placeBtn">Place order</button></form>' +
      '<aside class="summary card"><h3>Your order</h3><div id="sum"></div><form class="coupon-form" id="cpForm"><input name="code" placeholder="Coupon code" maxlength="24" value="' + esc(code) + '"><button class="btn btn-outline btn-sm">Apply</button></form><p id="cpMsg" class="small"></p></aside></div>';
    function applyCoupon(c, quiet) {
      if (!c) { cp = null; DM.coupon.set(''); summary(); return Promise.resolve(); }
      return DM.api('POST', '/coupons/validate', { code: c, subtotal: r.subtotal }).then(function (d) { cp = d; DM.coupon.set(d.code); document.getElementById('cpMsg').innerHTML = '<span class="coupon-applied">✔ ' + esc(d.title) + ' applied</span>'; summary(); })
        .catch(function (e) { cp = null; DM.coupon.set(''); if (!quiet) document.getElementById('cpMsg').innerHTML = '<span class="error-text">' + esc(e.message) + '</span>'; summary(); });
    }
    var form = document.getElementById('coForm');
    function zoneChanged() { zone = zones.filter(function (z) { return z.id === form.zone.value; })[0] || zones[0]; var n = document.getElementById('zoneNote'); if (n) n.textContent = zone.viaCourier ? S.courierOutsideNote : ''; summary(); }
    form.querySelectorAll('[name=zone]').forEach(function (x) { x.addEventListener('change', zoneChanged); });
    form.querySelectorAll('[name=payment]').forEach(function (x) { x.addEventListener('change', function () { pay = pays.filter(function (o) { return o.id === x.value; })[0]; payExtra(); }); });
    document.getElementById('cpForm').addEventListener('submit', function (e) { e.preventDefault(); applyCoupon(e.target.code.value.trim().toUpperCase()); });
    payExtra(); zoneChanged(); if (code) applyCoupon(code, true);

    // a random key for THIS checkout: pressing the button twice (or a network retry) can never create two orders
    var key; try { key = sessionStorage.getItem('dm_order_key'); } catch (e) { /* ignore */ }
    if (!key) { key = Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(12)), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); try { sessionStorage.setItem('dm_order_key', key); } catch (e) { /* ignore */ } }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form, msg = document.getElementById('coMsg'), btn = document.getElementById('placeBtn');
      var phone = DM.normPhone(f.phone.value), err = '';
      if (f.name.value.trim().length < 2) err = 'Please enter your full name.'; else if (!DM.isPhone(phone)) err = 'Enter a valid mobile number, e.g. 01712345678.'; else if (f.address.value.trim().length < 8) err = 'Please write your full address.';
      else if (isManual(pay) && (!f.paymentRef.value.trim() || !DM.isPhone(DM.normPhone(f.paymentFrom.value)))) err = 'Enter the TrxID and the number you paid from.';
      if (err) { msg.innerHTML = DM.alertHtml('error', err); return; }
      var body = { name: f.name.value.trim(), phone: phone, address: f.address.value.trim(), zone: zone.id, payment: pay.id, note: f.note.value.trim(), couponCode: cp ? cp.code : undefined, idempotencyKey: key,
        items: r.lines.map(function (l) { return { id: l.product.id, variantId: l.vid || undefined, qty: l.qty }; }) };
      if (isManual(pay)) { body.paymentRef = f.paymentRef.value.trim(); body.paymentFrom = DM.normPhone(f.paymentFrom.value); }
      btn.disabled = true; btn.textContent = 'Placing order...'; msg.innerHTML = '';
      DM.api('POST', '/orders', body).then(function (o) {
        DM.save('dm_customer', { name: body.name, phone: body.phone, address: body.address });
        DM.lastOrder.set({ orderNo: o.orderNo, phone: o.phone, total: o.total, ids: o.items.map(function (i) { return i.id; }), createdAt: o.createdAt });
        try { sessionStorage.removeItem('dm_order_key'); } catch (e2) { /* ignore */ }
        DM.cart.clear(); location.href = '/order-success.html';
      }).catch(function (e2) { msg.innerHTML = DM.alertHtml('error', e2.message); btn.disabled = false; btn.textContent = 'Place order'; });
    });
  }).catch(function (e) { DM.fail(box, e); });
});
