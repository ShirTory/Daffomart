/* wishlist.js  -  WISHLIST (replaces wishlist.php + api/products.php)
   The saved product slugs live in the browser (localStorage, key "dm_wishlist"). */
(function () {
  var grid = document.getElementById('wishlistGrid');
  var empty = document.getElementById('wishlistEmpty');

  async function render() {
    var slugs = DM.wish.get();
    if (!slugs.length) { grid.innerHTML = ''; empty.hidden = false; return; }
    try {
      var catalog = await DM.db.getCatalog();
      var items = slugs.map(function (s) { return DM.findProduct(catalog, s); }).filter(Boolean);
      // forget products that no longer exist
      if (items.length !== slugs.length) { DM.wish.save(items.map(function (p) { return p.id; })); }
      empty.hidden = items.length > 0;
      grid.innerHTML = items.map(DM.productCard).join('');
      document.dispatchEvent(new Event('dm:rendered'));
    } catch (err) {
      DM.fail(grid, err);
    }
  }

  document.addEventListener('dm:wishchange', render);
  render();
})();
