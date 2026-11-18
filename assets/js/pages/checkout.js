/* checkout.js  -  CHECKOUT, cash on delivery (replaces checkout.php)
   Steps: validate form -> db.placeOrder() does ONE transaction: re-check stock + coupon,
   save the order, reduce stock.  Everything succeeds together, or nothing is saved. */
(async function () {
  var esc = DM.esc;
  var form = document.getElementById('checkoutForm');
  var summary = document.getElementById('checkoutSummary');
  var errorBox = document.getElementById('checkoutErrors');
  var rxBox = document.getElementById('rxNote');
  var state = { lines: [], subtotal: 0, coupon: null };

  function area() {
    var checked = form.querySelector('input[name="area"]:checked');
    return checked ? checked.value : 'inside';
  }

  function drawSummary() {
    var t = DM.totals(state.subtotal, area(), state.coupon);
    summary.innerHTML = '<h3>Your order</h3>' +
      state.lines.map(function (l) {
        return '<p class="row"><span>' + esc(l.product.name) + ' &times; ' + l.qty + '</span><span>' + DM.money(l.total) + '</span></p>';
      }).join('') +
      '<hr><p class="row"><span>Subtotal</span><strong>' + DM.money(t.subtotal) + '</strong></p>' +
      (t.discount > 0 ? '<p class="row discount"><span>Coupon ' + esc(t.coupon.code) + '</span><strong>- ' + DM.money(t.discount) + '</strong></p>' : '') +
      '<p class="row"><span>Delivery</span><strong>' + (t.delivery > 0 ? DM.money(t.delivery) : 'Free') + '</strong></p>' +
      '<p class="row total"><span>Total</span><strong>' + DM.money(t.total) + '</strong></p>' +
      (t.coupon ? '' : '<p class="small"><a href="cart.html">Have a coupon code? Add it in the cart.</a></p>');
  }

  try {
    var cart = await DM.cartLines();
    if (!cart.lines.length) {
      DM.flash('info', 'Your cart is empty.');
      location.href = 'cart.html';
      return;
    }
    state.lines = cart.lines;
    state.subtotal = cart.subtotal;
    var ac = await DM.activeCoupon(cart.subtotal);
    state.coupon = ac.coupon;
    if (ac.note) { errorBox.innerHTML = DM.alertHtml('info', ac.note); }
    if (cart.lines.some(function (l) { return l.product.isRx; })) { rxBox.hidden = false; }

    // fill the form for logged-in customers
    var user = await DM.db.authReady();
    if (user) {
      if (user.name) { form.elements.name.value = user.name; }
      if (user.phone) { form.elements.phone.value = user.phone; }
    }
    form.hidden = false;
    drawSummary();
  } catch (err) {
    DM.fail(errorBox, err);
    return;
  }

  form.querySelectorAll('input[name="area"]').forEach(function (r) { r.addEventListener('change', drawSummary); });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    errorBox.innerHTML = '';
    if (!DM.validateForm(form)) { return; }
    var note = form.elements.note.value.trim();
    if (note.length > 500) { errorBox.innerHTML = DM.alertHtml('error', 'Order note is too long (max 500 characters).'); return; }

    var btn = form.querySelector('button.btn-primary');
    btn.disabled = true;                       // stop double clicks
    btn.textContent = 'Placing order...';
    try {
      var result = await DM.db.placeOrder({
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        address: form.elements.address.value.trim(),
        area: area(),
        note: note,
        couponCode: state.coupon ? state.coupon.code : '',
        items: state.lines.map(function (l) { return { slug: l.product.id, qty: l.qty }; })
      });
      DM.cart.clear();
      try { sessionStorage.setItem('dm_last_order', result.key); } catch (e) { /* ignore */ }
      location.href = 'order-success.html';
    } catch (err) {
      if (/^Your coupon was removed/.test(err.message || '')) { DM.coupon.set(''); state.coupon = null; drawSummary(); }
      errorBox.innerHTML = DM.alertHtml('error', DM.db.errorText(err));
      btn.disabled = false;
      btn.textContent = 'Place order';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
})();
