/* shop.js  -  SHOP PAGE (replaces products.php)
   Filters come from the address bar:  ?q=milk  &cat=veg  &kind=medicine  &sort=price_asc  &page=2 */
(async function () {
  var esc = DM.esc;
  var box = document.getElementById('shop');

  // 1) read filters from the URL
  var f = {
    q: DM.param('q').trim(),
    cat: DM.param('cat'),
    kind: ['medicine', 'grocery'].indexOf(DM.param('kind')) !== -1 ? DM.param('kind') : '',
    sort: DM.param('sort') || 'new',
    page: Math.max(1, parseInt(DM.param('page'), 10) || 1)
  };

  // helper: keep the current filters when making links
  function shopLink(change) {
    var merged = Object.assign({}, f, change);
    var params = new URLSearchParams();
    Object.keys(merged).forEach(function (k) {
      var v = merged[k];
      if (v !== '' && v != null && !(k === 'sort' && v === 'new') && !(k === 'page' && v === 1)) { params.set(k, v); }
    });
    var s = params.toString();
    return 'products.html' + (s ? '?' + s : '');
  }

  try {
    var catalog = await DM.db.getCatalog();
    var kindOf = {};
    catalog.categories.forEach(function (c) { kindOf[c.id] = c.kind; });

    // 2) filter
    var q = f.q.toLowerCase();
    var items = catalog.products.filter(function (p) {
      if (q && p.name.toLowerCase().indexOf(q) === -1 && String(p.genericName || '').toLowerCase().indexOf(q) === -1) { return false; }
      if (f.cat && p.categoryId !== f.cat) { return false; }
      if (f.kind && kindOf[p.categoryId] !== f.kind) { return false; }
      return true;
    });

    // 3) sort (only allowed values)
    var sorters = {
      new: function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); },
      price_asc: function (a, b) { return a.price - b.price; },
      price_desc: function (a, b) { return b.price - a.price; },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    };
    items.sort(sorters[f.sort] || sorters.new);

    // 4) pagination
    var perPage = DM.cfg.perPage;
    var total = items.length;
    var totalPages = Math.max(1, Math.ceil(total / perPage));
    var page = Math.min(f.page, totalPages);
    var pageItems = items.slice((page - 1) * perPage, page * perPage);

    var title = f.kind === 'medicine' ? 'Medicine & Healthcare' : 'All products';
    document.title = (f.kind === 'medicine' ? 'Medicine' : 'Shop') + ' | ' + DM.cfg.store.name;

    var sidebar = '<li><a class="' + (f.cat === '' ? 'active' : '') + '" href="' + esc(shopLink({ cat: '', page: 1 })) + '">All</a></li>' +
      catalog.categories.map(function (c) {
        return '<li><a class="' + (f.cat === c.id ? 'active' : '') + '" href="' + esc(shopLink({ cat: c.id, kind: '', page: 1 })) + '">' + esc(c.emoji + ' ' + c.name) + '</a></li>';
      }).join('');

    var sortOptions = [['new', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['name', 'Name A-Z']]
      .map(function (o) { return '<option value="' + o[0] + '"' + (f.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');

    var pager = '';
    if (totalPages > 1) {
      pager = '<nav class="pagination">';
      for (var i = 1; i <= totalPages; i++) {
        pager += '<a class="' + (i === page ? 'active' : '') + '" href="' + esc(shopLink({ page: i })) + '">' + i + '</a>';
      }
      pager += '</nav>';
    }

    box.innerHTML =
      '<h1>' + esc(title) + '</h1>' +
      '<div class="shop-layout">' +
        '<aside class="sidebar card"><h3>Categories</h3><ul>' + sidebar + '</ul></aside>' +
        '<section>' +
          '<div class="sortbar"><span class="muted">' + total + ' product' + (total === 1 ? '' : 's') + (f.q ? ' for "' + esc(f.q) + '"' : '') + '</span>' +
            '<label>Sort: <select id="sortSelect">' + sortOptions + '</select></label></div>' +
          (pageItems.length
            ? '<div class="product-grid">' + pageItems.map(DM.productCard).join('') + '</div>' + pager
            : '<div class="empty card"><p class="big">🔍</p><h3>No products found</h3><p class="muted">Try a different search or category.</p></div>') +
        '</section>' +
      '</div>';

    document.getElementById('sortSelect').addEventListener('change', function (event) {
      location.href = shopLink({ sort: event.target.value, page: 1 });
    });
    document.dispatchEvent(new Event('dm:rendered'));
  } catch (err) {
    DM.fail(box, err);
  }
})();
