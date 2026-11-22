/* Wishlist: product ids saved in this browser. */
DM.ready(function (st) {
  var box = document.getElementById('wishBox');
  function draw() {
    var ids = DM.wish.get(); if (!ids.length) { box.className = ''; box.innerHTML = '<div class="empty"><p>Your wishlist is empty. Tap the ♡ on any product.</p><a class="btn btn-primary" href="/products.html">Browse products</a></div>'; return; }
    DM.api('GET', '/products?limit=100&ids=' + ids.join(',')).then(function (r) { box.className = 'product-grid'; box.innerHTML = r.items.length ? DM.grid(r.items, st.settings.labelRules) : '<p class="empty">Saved products are no longer available.</p>'; DM.rendered(); }).catch(function (e) { DM.fail(box, e); });
  }
  draw(); document.addEventListener('dm:wishchange', function () { setTimeout(draw, 50); });
});
