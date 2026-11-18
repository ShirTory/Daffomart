/* success.js  -  shown after an order is placed (replaces order-success.php).
   The secret order key is kept in this browser tab (sessionStorage), so only the person who just ordered sees it. */
(async function () {
  var esc = DM.esc;
  var box = document.getElementById('successView');
  var key = '';
  try { key = sessionStorage.getItem('dm_last_order') || ''; } catch (e) { /* ignore */ }
  if (!key) { location.replace('index.html'); return; }

  try {
    var order = await DM.db.getOrder(key);
    if (!order) { location.replace('index.html'); return; }
    box.innerHTML =
      '<div class="card success-box">' +
        '<p class="big">✅</p>' +
        '<h1>Thank you, ' + esc(order.customerName) + '!</h1>' +
        '<p>Your order has been placed. Your order number is</p>' +
        '<p class="order-no">' + esc(order.orderNo) + '</p>' +
        '<p class="muted">Save this number. You can track the order with it and your phone number.</p>' +
        '<table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>' +
          order.items.map(function (i) { return '<tr><td>' + esc(i.name) + '</td><td>' + i.qty + '</td><td>' + DM.money(i.lineTotal) + '</td></tr>'; }).join('') +
          '<tr><td colspan="2">Subtotal</td><td>' + DM.money(order.subtotal) + '</td></tr>' +
          (order.discount > 0 ? '<tr><td colspan="2">Coupon ' + esc(order.couponCode) + '</td><td>- ' + DM.money(order.discount) + '</td></tr>' : '') +
          '<tr><td colspan="2">Delivery</td><td>' + DM.money(order.deliveryCharge) + '</td></tr>' +
          '<tr class="total-row"><td colspan="2">Total (cash on delivery)</td><td>' + DM.money(order.total) + '</td></tr>' +
        '</tbody></table>' +
        '<a class="btn btn-primary" href="track.html?order_no=' + encodeURIComponent(order.orderNo) + '">Track this order</a> ' +
        '<a class="btn btn-outline" href="products.html">Continue shopping</a>' +
      '</div>';
  } catch (err) {
    DM.fail(box, err);
  }
})();
