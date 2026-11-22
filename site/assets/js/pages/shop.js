/* Shop and Medicine pages: filter by category, price, offers; sort; pages. Filters live in the address bar (?cat=&sort=&q=&page=). */
DM.ready(function (st) {
  var esc = DM.esc, isMed = location.pathname.indexOf('medicine') !== -1, per = DM.cfg.perPage || 12;
  var P = new URLSearchParams(location.search);
  var base = isMed ? '/medicine.html' : '/products.html';
  var cats = st.categories.filter(function (c) { return isMed ? c.kind === 'medicine' : c.kind !== 'medicine'; });
  var medIds = st.categories.filter(function (c) { return c.kind === 'medicine'; }).map(function (c) { return c.id; });
  var notice = document.getElementById('medNotice'); if (notice) notice.textContent = st.settings.medicineNotice || '';
  if (isMed) { document.getElementById('shopTitle').textContent = st.settings.medicineTitle || 'Medicine & Healthcare'; }

  function url(changes) { var q = new URLSearchParams(location.search); Object.keys(changes).forEach(function (k) { if (changes[k] === '' || changes[k] == null) q.delete(k); else q.set(k, changes[k]); }); if (!('page' in changes)) q.delete('page'); var s = q.toString(); return base + (s ? '?' + s : ''); }
  var cat = P.get('cat') || '';
  document.getElementById('catList').innerHTML = '<li><a href="' + esc(url({ cat: '' })) + '" class="' + (!cat ? 'active' : '') + '">All</a></li>' + cats.map(function (c) { return '<li><a href="' + esc(url({ cat: c.id })) + '" class="' + (cat === c.id ? 'active' : '') + '">' + esc(c.emoji) + ' ' + esc(c.name) + '</a></li>'; }).join('');
  var cur = st.categories.filter(function (c) { return c.id === cat; })[0];
  if (cur) { document.getElementById('shopTitle').textContent = cur.name; document.getElementById('crumb').textContent = cur.name;
    var cb = document.getElementById('coverBox'); if (cb && cur.coverImage) cb.innerHTML = '<div class="cat-cover" style="background-image:url(\'' + esc(cur.coverImage) + '\')"><h2>' + esc(cur.coverTitle || cur.name) + '</h2></div>'; }
  if (P.get('q')) document.getElementById('shopTitle').textContent = 'Results for “' + P.get('q') + '”';
  var sort = document.getElementById('sortSel'); sort.value = P.get('sort') || 'newest'; sort.onchange = function () { location.href = url({ sort: sort.value }); };
  var pf = document.getElementById('priceForm'); pf.min.value = P.get('min') || ''; pf.max.value = P.get('max') || '';
  pf.onsubmit = function (e) { e.preventDefault(); location.href = url({ min: pf.min.value, max: pf.max.value }); };
  var so = document.getElementById('saleOnly'); so.checked = !!P.get('sale'); so.onchange = function () { location.href = url({ sale: so.checked ? '1' : '' }); };

  var page = Math.max(1, parseInt(P.get('page'), 10) || 1);
  var q = '/products?limit=500&sort=' + encodeURIComponent(P.get('sort') || 'newest');
  ['q', 'min', 'max'].forEach(function (k) { if (P.get(k)) q += '&' + k + '=' + encodeURIComponent(P.get(k)); });
  if (cat) q += '&cat=' + encodeURIComponent(cat); if (P.get('sale')) q += '&sale=1'; if (P.get('featured')) q += '&featured=1';
  DM.api('GET', q).then(function (r) {
    // keep medicine and grocery apart (the API filters by category, the page decides which kind it shows)
    var list = r.items.filter(function (p) { return isMed ? medIds.indexOf(p.categoryId) !== -1 : medIds.indexOf(p.categoryId) === -1; });
    var box = document.getElementById('results');
    var total = list.length, pages = Math.max(1, Math.ceil(total / per)); page = Math.min(page, pages);
    list = list.slice((page - 1) * per, page * per);
    box.innerHTML = list.length ? DM.grid(list, st.settings.labelRules) :
      '<div class="empty"><h3>' + esc(st.settings.emptyStateIcon || '🔍') + ' ' + esc(st.settings.emptyStateTitle || 'No products found') + '</h3><p class="muted">' + esc(st.settings.emptyStateText || '') + '</p></div>';
    var pg = '';
    if (pages > 1) for (var i = 1; i <= pages; i++) pg += '<a class="' + (i === page ? 'active' : '') + '" href="' + esc(url({ page: i })) + '">' + i + '</a>';
    document.getElementById('pager').innerHTML = pg; DM.rendered();
  }).catch(function (e) { DM.fail(document.getElementById('results'), e); });
});
