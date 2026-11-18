/* cart.js  -  SHOPPING CART (replaces cart.php)
   The cart lives in the browser (localStorage). Prices are always read fresh from Firebase. */
(function () {
  var esc = DM.esc;
  var box = document.getElementById('cartView');
  var state = { subtotal: 0 };

  async function render(message) {
    try {
      var cart = await DM.cartLines();
      var lines = cart.lines;
      state.subtotal = cart.subtotal;

      // forget cart items that no longer exist (deleted / hidden / out of stock)
      var clean = {};
      lines.forEach(function (l) { clean[l.product.id] = l.qty; });
      DM.cart.save(clean);

      var ac = await DM.activeCoupon(cart.subtotal);
      var notes = (message ? DM.alertHtml('info', message) : '') + (ac.note ? DM.alertHtml('info', ac.note) : '');
      var totals = DM.totals(cart.subtotal, 'inside', ac.coupon);

      if (!lines.length) {
        box.innerHTML = notes + '<div class="empty card"><p class="big">🛒</p><h3>Your cart is empty</h3>' +
          '<a class="btn btn-primary" href="products.html">Start shopping</a></div>';
        return;
      }

      var rows = lines.map(function (l) {
        var p = l.product;
        return '<tr>' +
          '<td><a href="' + esc(DM.productUrl(p)) + '">' + esc(p.name) + '</a><div class="muted small">' + esc(p.unit) + '</div></td>' +
          '<td>' + DM.money(p.price) + '</td>' +
          '<td class="qty-cell"><input class="qty" type="number" data-stepper data-slug="' + esc(p.id) + '" value="' + l.qty + '" min="0" max="' + p.stock + '" aria-label="Quantity of ' + esc(p.name) + '"></td>' +
          '<td>' + DM.money(l.total) + '</td>' +
          '<td><button class="link-danger" type="button" data-remove="' + esc(p.id) + '">Remove</button></td>' +
        '</tr>';
      }).join('');

      var couponHtml = totals.coupon
        ? '<div class="coupon-applied"><span>🏷️ <strong>' + esc(totals.coupon.code) + '</strong> applied</span><button class="link-danger" type="button" id="removeCoupon">Remove</button></div>'
        : '<form class="coupon-form" id="couponForm"><input type="text" name="code" placeholder="Coupon code" autocomplete="off" aria-label="Coupon code" maxlength="30"><button class="btn btn-outline">Apply</button></form>';

      box.innerHTML = notes +
        '<div class="cart-layout">' +
          '<form class="card table-wrap" id="cartForm">' +
            '<button type="submit" class="visually-hidden" tabindex="-1" aria-hidden="true">Update</button>' +
            '<table class="table"><thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
            '<div class="table-actions"><button class="btn btn-outline" type="submit">Update cart</button></div>' +
          '</form>' +
          '<aside class="card summary">' +
            '<h3>Order summary</h3>' + couponHtml +
            '<p class="row"><span>Subtotal</span><strong>' + DM.money(totals.subtotal) + '</strong></p>' +
            (totals.discount > 0 ? '<p class="row discount"><span>Discount</span><strong>- ' + DM.money(totals.discount) + '</strong></p>' : '') +
            '<p class="muted small">Delivery charge is added at checkout.</p>' +
            '<a class="btn btn-primary btn-block" href="checkout.html">Proceed to checkout</a>' +
            '<button class="btn btn-ghost btn-block" type="button" id="clearCart">Clear cart</button>' +
          '</aside>' +
        '</div>';
      document.dispatchEvent(new Event('dm:rendered'));
    } catch (err) {
      DM.fail(box, err);
    }
  }

  // one listener for everything inside the cart box (works after every re-draw)
  box.addEventListener('click', async function (event) {
    var remove = event.target.closest('[data-remove]');
    if (remove) {
      var cart = DM.cart.get();
      delete cart[remove.dataset.remove];
      DM.cart.save(cart);
      DM.toast('Item removed.');
      render();
    }
    if (event.target.id === 'removeCoupon') { DM.coupon.set(''); DM.toast('Coupon removed.'); render(); }
    if (event.target.id === 'clearCart') { DM.cart.clear(); render(); }
  });

  box.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (event.target.id === 'cartForm') {
      var cart = DM.cart.get();
      event.target.querySelectorAll('input[data-slug]').forEach(function (input) {
        var qty = parseInt(input.value, 10) || 0;
        if (qty <= 0) { delete cart[input.dataset.slug]; } else { cart[input.dataset.slug] = Math.min(qty, 99); }
      });
      DM.cart.save(cart);
      DM.toast('Cart updated.');
      render();
    }
    if (event.target.id === 'couponForm') {
      var code = event.target.elements.code.value.trim().toUpperCase();
      if (!code) { DM.toast('Please enter a coupon code.', 'info'); return; }
      var c = await DM.db.getCoupon(code);
      var why = DM.couponProblem(c, state.subtotal);
      if (why) { DM.toast(why, 'info'); return; }
      DM.coupon.set(c.code);
      DM.toast('Coupon ' + c.code + ' applied.');
      render();
    }
  });

  render();
})();
