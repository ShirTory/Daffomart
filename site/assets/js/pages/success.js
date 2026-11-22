/* Order placed: shows the order number and where to track it. */
DM.ready(function (st) {
  var esc = DM.esc, box = document.getElementById('successBox'), lo = DM.lastOrder.get();
  if (!lo) { box.innerHTML = '<div class="empty"><p>No recent order found.</p><a class="btn btn-primary" href="/products.html">Shop now</a></div>'; return; }
  box.innerHTML = '<div class="success-box card"><h1>✅ Thank you! Your order is placed.</h1><p>Your order number</p><p class="order-no">' + esc(lo.orderNo) + '</p>' +
    '<p>Total to pay: <strong>' + DM.money(lo.total) + '</strong></p><p class="muted">Save your order number. You need it with your phone number (' + esc(lo.phone) + ') to track the order. You can cancel within 2 minutes from the tracking page.</p>' +
    '<a class="btn btn-primary" href="/track.html?no=' + encodeURIComponent(lo.orderNo) + '&phone=' + encodeURIComponent(lo.phone) + '">Track this order</a> <a class="btn btn-outline" href="/products.html">Continue shopping</a></div>';
});
