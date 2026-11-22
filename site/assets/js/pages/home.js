/* Home page: draws the sections in the order the admin chose (Admin -> Settings -> Home sections). */
DM.ready(function (st) {
  var S = st.settings, esc = DM.esc, root = document.getElementById('home');
  var rules = S.labelRules;
  DM.api('GET', '/products?limit=500&sort=newest').then(function (r) {
    var all = r.items, cats = st.categories;
    var medIds = cats.filter(function (c) { return c.kind === 'medicine'; }).map(function (c) { return c.id; });
    var isMed = function (p) { return medIds.indexOf(p.categoryId) !== -1; };
    var groc = all.filter(function (p) { return !isMed(p); }), meds = all.filter(isMed);
    var byCats = function (ids) { return ids && ids.length ? groc.filter(function (p) { return ids.indexOf(p.categoryId) !== -1; }).slice(0, 12) : []; };
    var featured = groc.filter(function (p) { return p.featured; }).slice(0, 12);
    var newest = groc.slice(0, 12);
    var best = groc.filter(function (p) { return p.sold > 0; }).sort(function (a, b) { return b.sold - a.sold; }).slice(0, 12);
    var sale = all.filter(function (p) { return p.oldPrice && p.oldPrice > p.price; }).slice(0, 12);
    var daily = byCats(S.homeDailyCatIds); if (!daily.length) daily = featured;
    var fresh = byCats(S.homeFreshCatIds); if (!fresh.length) fresh = newest;
    var household = byCats(S.homeHouseholdCatIds);
    var today = new Date().toISOString().slice(0, 10);
    var offerProds = all.filter(function (p) { return p.oldPrice && p.oldPrice > p.price && (!p.offerStartsAt || p.offerStartsAt <= today) && (!p.offerEndsAt || p.offerEndsAt >= today); })
      .sort(function (a, b) { return DM.pct(b.price, b.oldPrice) - DM.pct(a.price, a.oldPrice); }).slice(0, 12);

    function section(title, list, href, emoji) {
      if (!list.length) return '';
      return '<section class="home-sec"><div class="section-head"><h2 class="section-title">' + (emoji ? emoji + ' ' : '') + esc(title) + '</h2><a href="' + esc(href) + '">View all &rarr;</a></div>' +
        '<div class="product-row">' + DM.grid(list, rules) + '</div></section>';
    }
    var blocks = {
      hero: function () {
        if (st.banners.length) {
          return '<section class="slider" id="slider">' + st.banners.map(function (b, i) {
            return '<div class="slide' + (i ? '' : ' on') + '"><picture>' + (b.mobileImage ? '<source media="(max-width:640px)" srcset="' + esc(b.mobileImage) + '">' : '') + '<img src="' + esc(b.image) + '" alt="' + esc(b.title || '') + '"></picture>' +
              (b.title || b.subtitle || b.ctaLabel ? '<div class="slide-text">' + (b.title ? '<h2>' + esc(b.title) + '</h2>' : '') + (b.subtitle ? '<p>' + esc(b.subtitle) + '</p>' : '') + (b.ctaLabel ? '<a class="btn btn-accent" href="' + esc(DM.safeHref(b.ctaHref)) + '">' + esc(b.ctaLabel) + '</a>' : '') + '</div>' : '') + '</div>';
          }).join('') + (st.banners.length > 1 ? '<div class="dots">' + st.banners.map(function (_, i) { return '<button type="button" data-dot="' + i + '" class="' + (i ? '' : 'on') + '" aria-label="Slide ' + (i + 1) + '"></button>'; }).join('') + '</div>' : '') + '</section>';
        }
        return '<section class="hero"><div><h1>' + esc(S.heroTitle).replace(/\n/g, '<br>') + '</h1><p>' + esc(S.heroSubtitle) + '</p><a class="btn btn-accent" href="/products.html">' + esc(S.heroCta || 'Shop now') + '</a>' +
          (S.showMedicine !== false ? ' <a class="btn btn-light" href="/medicine.html">Order medicine</a>' : '') + '</div></section>';
      },
      features: function () {
        var icons = { truck: '🚚', leaf: '🌿', cash: '💵', tag: '🏷️', shield: '🛡️', clock: '⏰', heart: '❤️', star: '⭐' };
        return '<section class="features">' + (S.features || []).slice(0, 4).map(function (f) {
          return '<div class="feature"><span>' + (f.image ? '<img class="feat-img" src="' + esc(f.image) + '" alt="">' : esc(icons[f.icon] || f.icon || '✔')) + '</span><strong>' + esc(f.title) + '</strong><small>' + esc(f.text) + '</small></div>';
        }).join('') + '</section>';
      },
      categories: function () {
        var shop = cats.filter(function (c) { return c.kind !== 'medicine' && !c.hideOnHome; });
        if (!shop.length || S.showCatSection === false) return '';
        return '<section class="home-sec"><h2 class="section-title">Shop by category</h2><div class="category-grid">' + shop.map(function (c) {
          return '<a class="category-box" href="/products.html?cat=' + esc(c.id) + '"' + (c.iconBg ? ' style="background:' + esc(c.iconBg) + '"' : '') + '>' + (c.image ? '<img class="cat-img" src="' + esc(c.image) + '" alt="">' : '<span class="cat-emoji">' + esc(c.emoji) + '</span>') + '<span>' + esc(c.name) + '</span></a>';
        }).join('') + '</div></section>';
      },
      buyAgain: function () {   // products from the customer's last order (kept in this browser)
        var lo = DM.lastOrder.get(); if (!lo || !lo.ids || !lo.ids.length) return '';
        var list = all.filter(function (p) { return lo.ids.indexOf(p.id) !== -1; }).slice(0, 8);
        return section('Buy again', list, '/orders.html', '🔁');
      },
      best: function () { return section(S.homeBestTitle || 'Best Sellers', best, '/products.html?sort=popular', '📈'); },
      daily: function () { return section(S.homeDailyTitle || 'Daily Essentials', daily, '/products.html?featured=1', '🛒'); },
      fresh: function () { return section(S.homeFreshTitle || 'Fresh Food & Grocery', fresh, '/products.html', '🥬'); },
      household: function () { return section(S.homeHouseholdTitle || 'Household Essentials', household, '/products.html', '🏠'); },
      offerProducts: function () { return section('Offers', offerProds, '/products.html?sale=1', '🏷️'); },
      offers: function () {
        var posters = st.offers.filter(function (o) { return o.image; }).slice(0, 4), texts = st.offers.filter(function (o) { return !o.image; }).slice(0, 6);
        var codeBtn = function (o) { return o.code ? '<button type="button" class="copy-code" data-code="' + esc(o.code) + '">' + esc(o.code) + ' ⧉</button>' : ''; };
        return (posters.length ? '<section class="home-sec"><h2 class="section-title">🔥 Deals</h2><div class="offer-grid">' + posters.map(function (o) {
          return '<div class="card offer-card"><img src="' + esc(o.image) + '" alt="" loading="lazy"><div class="card-body"><h3>' + esc(o.title) + '</h3>' + (o.description ? '<p class="muted small">' + esc(o.description) + '</p>' : '') + codeBtn(o) + (o.minOrder > 0 ? ' <span class="muted small">Min ' + DM.money(o.minOrder) + '</span>' : '') + '</div></div>'; }).join('') + '</div></section>' : '') +
          (texts.length ? '<div class="offer-grid">' + texts.map(function (o) {
            return '<div class="card offer-text"><div class="offer-pct">' + (o.discountType === 'percent' ? o.discountValue + '%' : DM.money(o.discountValue)) + '</div><div><strong>' + esc(o.title) + '</strong><br>' + codeBtn(o) + '</div></div>'; }).join('') + '</div>' : '');
      },
      sale: function () { return section('Hot Deals', sale, '/products.html?sale=1', '🔥'); },
      medicine: function () { return S.showMedicine !== false ? section(S.medicineTitle || 'Medicine & Healthcare', meds.slice(0, 10), '/medicine.html', '💊') : ''; },
      new: function () { return section('New Arrivals', newest, '/products.html', '✨'); }
    };
    var order = (S.homeSections || []).filter(function (s) { return s.visible !== false; });
    var html = order.map(function (s) { return blocks[s.id] ? blocks[s.id]() : ''; }).join('');
    if (!all.length) html += '<p class="empty">Products are coming soon. Please check back later.</p>';
    root.innerHTML = html; DM.rendered();
    startSlider(); copyButtons();
  }).catch(function (e) { DM.fail(root, e); });

  function startSlider() {
    var s = document.getElementById('slider'); if (!s) return;
    var slides = s.querySelectorAll('.slide'), dots = s.querySelectorAll('[data-dot]'), i = 0, timer;
    function go(n) { slides[i].classList.remove('on'); if (dots[i]) dots[i].classList.remove('on'); i = (n + slides.length) % slides.length; slides[i].classList.add('on'); if (dots[i]) dots[i].classList.add('on'); }
    dots.forEach(function (d) { d.addEventListener('click', function () { go(+d.dataset.dot); }); });
    if (slides.length > 1) { timer = setInterval(function () { go(i + 1); }, 5000); s.addEventListener('mouseenter', function () { clearInterval(timer); }); }
  }
  function copyButtons() {
    document.querySelectorAll('.copy-code').forEach(function (b) { b.addEventListener('click', function () {
      try { navigator.clipboard.writeText(b.dataset.code); DM.toast('Code ' + b.dataset.code + ' copied'); } catch (e) { DM.toast('Code: ' + b.dataset.code, 'info'); } }); });
  }
});
