/* track.js  -  ORDER TRACKING (replaces track.php). Customer enters order number + phone. Both must match. */
(function () {
  var esc = DM.esc;
  var form = document.getElementById('trackForm');
  var out = document.getElementById('trackResult');
  var steps = ['pending', 'confirmed', 'shipped', 'delivered'];

  form.elements.order_no.value = DM.param('order_no');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!DM.validateForm(form)) { return; }
    out.innerHTML = '<p class="loading">Searching...</p>';
    try {
      var order = await DM.db.findOrder(form.elements.order_no.value, form.elements.phone.value);
      if (!order) { out.innerHTML = DM.alertHtml('error', 'No order found. Check the order number and phone number.'); return; }

      var progress;
      if (order.status === 'cancelled') {
        progress = '<div class="alert alert-error">This order was cancelled.</div>';
      } else {
        var reached = steps.indexOf(order.status);
        progress = '<ol class="steps">' + steps.map(function (s, i) {
          return '<li class="' + (i <= reached ? 'done' : '') + '">' + esc(DM.statusLabel(s)) + '</li>';
        }).join('') + '</ol>';
      }
      out.innerHTML =
        '<div class="card result-box">' +
          '<h2>Order ' + esc(order.orderNo) + '</h2>' +
          '<p class="muted">Placed on ' + esc(DM.fmtDate(order.createdAt, true)) + '</p>' + progress +
          '<table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>' +
            order.items.map(function (i) { return '<tr><td>' + esc(i.name) + '</td><td>' + i.qty + '</td><td>' + DM.money(i.lineTotal) + '</td></tr>'; }).join('') +
            (order.discount > 0 ? '<tr><td colspan="2">Coupon ' + esc(order.couponCode) + '</td><td>- ' + DM.money(order.discount) + '</td></tr>' : '') +
            '<tr><td colspan="2">Delivery</td><td>' + DM.money(order.deliveryCharge) + '</td></tr>' +
            '<tr class="total-row"><td colspan="2">Total</td><td>' + DM.money(order.total) + '</td></tr>' +
          '</tbody></table>' +
          '<p class="muted small">Delivery address: ' + esc(order.address) + '</p>' +
        '</div>';
    } catch (err) {
      DM.fail(out, err);
    }
  });
})();
