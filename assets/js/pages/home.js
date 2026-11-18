/* home.js  -  HOME PAGE: category boxes, best sellers, medicine (replaces index.php) */
(async function () {
  var esc = DM.esc;
  var catBox = document.getElementById('categories');
  var featBox = document.getElementById('featured');
  var medBox = document.getElementById('medicine');

  try {
    var catalog = await DM.db.getCatalog();
    if (!catalog.categories.length) {
      catBox.innerHTML = '<p class="muted">No products yet. Shop owner: open the admin panel and press "Load sample data".</p>';
      featBox.innerHTML = '';
      medBox.innerHTML = '';
      return;
    }

    var kindOf = {};
    catalog.categories.forEach(function (c) { kindOf[c.id] = c.kind; });

    catBox.innerHTML = catalog.categories.map(function (c) {
      return '<a class="category-box" href="products.html?cat=' + encodeURIComponent(c.id) + '">' +
        '<span class="cat-emoji">' + esc(c.emoji) + '</span><span>' + esc(c.name) + '</span></a>';
    }).join('');

    // products are already sorted: newest first
    var featured = catalog.products.filter(function (p) { return p.featured && kindOf[p.categoryId] === 'grocery'; }).slice(0, 8);
    var medicine = catalog.products.filter(function (p) { return kindOf[p.categoryId] === 'medicine'; }).slice(0, 4);

    featBox.innerHTML = featured.length ? featured.map(DM.productCard).join('') : '<p class="muted">No featured products yet.</p>';
    medBox.innerHTML = medicine.map(DM.productCard).join('');
    document.dispatchEvent(new Event('dm:rendered'));
  } catch (err) {
    DM.fail(catBox, err);
    featBox.innerHTML = '';
    medBox.innerHTML = '';
  }
})();
