/* Cart page: change quantities, remove items, apply a coupon. Prices come fresh from the server. */
DM.ready(function (st) {
  var esc = DM.esc, box = document.getElementById('cartBox');
  function setQty(id, vid, qty) {
    var c = DM.cart.get().map(function (l) { if (l.id === id && (l.vid || '') === (vid || '')) l.qty = qty; return l; }).filter(function (l) { return l.qty > 0; });
    DM.cart.save(c); draw();
  }
  function draw() {
    DM.cartLines().then(function (r) {
      if (!r.lines.length) { box.innerHTML = '<div class="empty"><p>Your cart is empty.</p><a class="btn btn-primary" href="/products.html">Start shopping</a></div>'; return; }
      var code = DM.coupon.get(), p = code ? DM.api('POST', '/coupons/validate', { code: code, subtotal: r.subtotal }).catch(function (e) { DM.coupon.set(''); return { error: e.message }; }) : Promise.resolve(null);
      p.then(function (cp) {
        var disc = cp && cp.discount ? cp.discount : 0;
        box.innerHTML = '<div class="cart-layout"><div class="table-wrap"><table class="table"><thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead><tbody>' + r.lines.map(function (l, i) {
          return '<tr><td><a href="' + esc(DM.productUrl(l.product)) + '"><strong>' + esc(l.product.name) + '</strong></a><br><small class="muted">' + esc(l.variant ? DM.variantLabel(l.variant) : l.product.unit) + '</small></td><td>' + DM.money(l.price) + '</td>' +
            '<td class="qty-cell"><input type="number" min="1" max="' + l.stock + '" value="' + l.qty + '" data-stepper data-i="' + i + '" aria-label="Quantity"></td><td>' + DM.money(l.total) + '</td><td><button class="link-danger" data-rm="' + i + '">Remove</button></td></tr>';
        }).join('') + '</tbody></table></div><aside class="summary card"><h3>Order summary</h3>' +
          '<div class="row"><span>Subtotal</span><span>' + DM.money(r.subtotal) + '</span></div>' +
          (disc ? '<div class="row discount"><span>Coupon ' + esc(cp.code) + '</span><span>−' + DM.money(disc) + '</span></div>' : '') +
          '<p class="muted small">Delivery charge is added at checkout.</p>' +
          '<form class="coupon-form" id="couponForm"><input name="code" placeholder="Coupon code" value="' + esc(disc ? '' : '') + '" maxlength="24"><button class="btn btn-outline btn-sm">Apply</button></form>' +
          (cp && cp.error ? '<p class="error-text">' + esc(cp.error) + '</p>' : '') + (disc ? '<p class="coupon-applied">✔ ' + esc(cp.title) + ' <button class="link-danger" id="rmCoupon">remove</button></p>' : '') +
          '<a class="btn btn-primary btn-block" href="/checkout.html">Proceed to checkout</a><a class="btn btn-ghost btn-block" href="/products.html">Continue shopping</a></aside></div>';
        DM.initSteppers(box);
        box.querySelectorAll('input[data-i]').forEach(function (inp) { inp.addEventListener('change', function () { var l = r.lines[+inp.dataset.i]; setQty(l.product.id, l.vid, Math.min(Math.max(0, parseInt(inp.value, 10) || 0), l.stock)); }); });
        box.querySelectorAll('[data-rm]').forEach(function (b) { b.addEventListener('click', function () { var l = r.lines[+b.dataset.rm]; setQty(l.product.id, l.vid, 0); }); });
        document.getElementById('couponForm').addEventListener('submit', function (e) { e.preventDefault(); var c = e.target.code.value.trim().toUpperCase(); if (!c) return; DM.coupon.set(c); draw(); });
        var rc = document.getElementById('rmCoupon'); if (rc) rc.addEventListener('click', function () { DM.coupon.set(''); draw(); });
      });
    }).catch(function (e) { DM.fail(box, e); });
  }
  draw();
});
