/* account.js  -  "MY ORDERS" page for a logged-in customer (replaces account.php) */
(async function () {
  var esc = DM.esc;
  var box = document.getElementById('accountView');

  var user = await DM.db.authReady();
  if (!user) {
    DM.flash('info', 'Please login first.');
    location.replace('login.html?next=account.html');
    return;
  }

  try {
    var orders = await DM.db.myOrders(user.uid);
    box.innerHTML =
      '<h1>My orders</h1><p class="muted">Logged in as ' + esc(user.name || 'customer') + ' (' + esc(user.email) + ')</p>' +
      (!orders.length
        ? '<div class="empty card"><p class="big">📦</p><h3>No orders yet</h3><a class="btn btn-primary" href="products.html">Start shopping</a></div>'
        : '<div class="card table-wrap"><table class="table"><thead><tr><th>Order no</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>' +
          orders.map(function (o) {
            return '<tr><td>' + esc(o.orderNo) + '</td><td>' + esc(DM.fmtDate(o.createdAt)) + '</td><td>' + DM.money(o.total) + '</td>' +
              '<td><span class="status status-' + esc(o.status) + '">' + esc(DM.statusLabel(o.status)) + '</span></td></tr>';
          }).join('') + '</tbody></table></div>');
  } catch (err) {
    DM.fail(box, err);
  }
})();
