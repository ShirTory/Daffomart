/* My orders: customers see their last 20 orders by entering their phone number (no login). */
DM.ready(function () {
  var esc = DM.esc, f = document.getElementById('phoneForm'), box = document.getElementById('ordersBox');
  var lo = DM.lastOrder.get(), saved = DM.load('dm_customer', {}); f.phone.value = (lo && lo.phone) || saved.phone || DM.param('phone');
  function show(phone) {
    box.innerHTML = '<p class="loading">Loading...</p>';
    DM.api('GET', '/orders/my?phone=' + encodeURIComponent(phone)).then(function (list) {
      box.innerHTML = list.length ? list.map(function (o) {
        return '<div class="card order-card"><div class="row"><strong>' + esc(o.orderNo) + '</strong>' + DM.statusBadge(o.status) + '</div><p class="muted small">' + DM.fmtDate(o.createdAt, true) + ' · ' + o.itemCount + ' item(s) · <strong>' + DM.money(o.total) + '</strong></p>' +
          '<p class="small">' + o.items.map(function (i) { return esc(i.name) + ' ×' + i.qty; }).join(', ') + '</p><a class="btn btn-outline btn-sm" href="/track.html?no=' + encodeURIComponent(o.orderNo) + '&phone=' + encodeURIComponent(phone) + '">Track</a></div>';
      }).join('') : '<div class="empty"><p>No orders found for this number.</p></div>';
    }).catch(function (e) { DM.fail(box, e); });
  }
  f.addEventListener('submit', function (e) { e.preventDefault(); var p = DM.normPhone(f.phone.value); if (!DM.isPhone(p)) { box.innerHTML = DM.alertHtml('error', 'Enter a valid mobile number (01XXXXXXXXX)'); return; } show(p); });
  if (DM.isPhone(DM.normPhone(f.phone.value))) show(DM.normPhone(f.phone.value));
});
