/* Track an order with order number + phone. Shows progress steps, items, rider/courier and a 2-minute cancel button. */
DM.ready(function () {
  var esc = DM.esc, f = document.getElementById('trackForm'), box = document.getElementById('trackBox'), timer;
  var STEPS = ['pending', 'confirmed', 'processing', 'assigned', 'picked_up', 'on_the_way', 'delivered'];
  var lo = DM.lastOrder.get();
  f.no.value = DM.param('no') || (lo && lo.orderNo) || ''; f.phone.value = DM.param('phone') || (lo && lo.phone) || '';
  function show(no, phone) {
    clearInterval(timer);
    DM.api('GET', '/orders/track?no=' + encodeURIComponent(no) + '&phone=' + encodeURIComponent(phone)).then(function (o) {
      var idx = STEPS.indexOf(o.status), dead = o.status === 'cancelled' || o.status === 'returned';
      box.innerHTML = '<div class="result-box card"><div class="row"><div><h2>' + esc(o.orderNo) + '</h2><p class="muted small">Placed ' + DM.fmtDate(o.createdAt, true) + '</p></div>' + DM.statusBadge(o.status) + '</div>' +
        (dead ? '<div class="alert alert-error">This order was ' + esc(o.status) + '.</div>' : '<ol class="steps">' + STEPS.map(function (s, i) { return '<li class="' + (i <= idx ? 'done' : '') + '">' + esc(DM.STATUS[s]) + '</li>'; }).join('') + '</ol>') +
        (o.eta && !dead && o.status !== 'delivered' ? '<p>Estimated delivery: <strong>' + esc(o.eta) + '</strong></p>' : '') +
        (o.riderName ? '<p>🛵 Rider: <strong>' + esc(o.riderName) + '</strong>' + (o.riderPhone ? ' · <a href="tel:' + esc(o.riderPhone) + '">' + esc(o.riderPhone) + '</a>' : '') + '</p>' : '') +
        (o.courierName ? '<p>📦 Courier: <strong>' + esc(o.courierName) + '</strong>' + (o.trackingNo ? ' · Tracking: ' + esc(o.trackingNo) : '') + (o.courierUrl ? ' · <a target="_blank" rel="noopener" href="' + esc(o.courierUrl) + '">Track on courier site</a>' : '') + '</p>' : '') +
        '<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>' + o.items.map(function (i) { return '<tr><td>' + esc(i.name) + '<br><small class="muted">' + esc(i.unit || '') + '</small></td><td>' + i.qty + '</td><td>' + DM.money(i.price * i.qty) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="row"><span>Subtotal</span><span>' + DM.money(o.subtotal) + '</span></div>' + (o.discount ? '<div class="row discount"><span>Discount</span><span>−' + DM.money(o.discount) + '</span></div>' : '') +
        '<div class="row"><span>Delivery</span><span>' + (o.delivery ? DM.money(o.delivery) : 'Free') + '</span></div>' + (o.serviceCharge ? '<div class="row"><span>Service charge</span><span>' + DM.money(o.serviceCharge) + '</span></div>' : '') +
        '<div class="row total"><strong>Total</strong><strong>' + DM.money(o.total) + '</strong></div><p class="muted small">Payment: ' + esc(o.payment) + ' (' + esc(o.paymentStatus) + ')</p>' +
        (o.canCancel ? '<button class="btn btn-danger" id="cancelBtn">Cancel order</button> <span class="muted small" id="cancelLeft"></span>' : '') + '<div id="trMsg"></div></div>';
      var cb = document.getElementById('cancelBtn');
      if (cb) {
        var end = new Date(o.cancelEndsAt).getTime(), left = document.getElementById('cancelLeft');
        timer = setInterval(function () { var s = Math.round((end - Date.now()) / 1000); if (s <= 0) { clearInterval(timer); cb.remove(); left.textContent = ''; } else left.textContent = s + ' s left to cancel'; }, 1000);
        cb.addEventListener('click', function () {
          if (!confirm('Cancel this order?')) return; cb.disabled = true;
          DM.api('POST', '/orders/cancel', { no: no, phone: phone }).then(function () { DM.toast('Order cancelled'); show(no, phone); }).catch(function (e) { document.getElementById('trMsg').innerHTML = DM.alertHtml('error', e.message); cb.disabled = false; });
        });
      }
    }).catch(function (e) { box.innerHTML = DM.alertHtml('error', e.message); });
  }
  f.addEventListener('submit', function (e) { e.preventDefault(); var no = f.no.value.trim().toUpperCase(), p = DM.normPhone(f.phone.value); if (!no || !DM.isPhone(p)) { box.innerHTML = DM.alertHtml('error', 'Enter your order number and a valid phone number.'); return; } show(no, p); });
  if (f.no.value && DM.isPhone(DM.normPhone(f.phone.value))) show(f.no.value.trim().toUpperCase(), DM.normPhone(f.phone.value));
});
