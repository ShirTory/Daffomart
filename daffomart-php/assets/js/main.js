/* =====================================================================
   DaffoMart  -  main.js   (plain JavaScript, no libraries)
    1. Small helpers (toast message, cart badge)
    2. Dark / light theme
    3. Mobile menu
    4. Flash messages disappear automatically
    5. Form validation in the browser (before the form is sent to PHP)
    6. Live delivery charge + total on the checkout page
    7. Add to cart without reloading the page (AJAX with fetch)
    8. Live search suggestions
    9. Wishlist (saved in the browser) + wishlist page
   10. Quantity + / - buttons, back-to-top button
   NOTE: JavaScript only makes the site nicer. PHP still checks everything again on the server,
         and every form still works if JavaScript is turned off.
   ===================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- 1. Helpers ---------- */

  // create an element:  el('p', 'muted', 'Hello')
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  // small message that appears at the bottom and disappears after 3 seconds
  var toastBox = null;
  function toast(message, type) {
    if (!toastBox) {
      toastBox = el('div', 'toasts');
      toastBox.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastBox);
    }
    var t = el('div', 'toast toast-' + (type || 'success'), message);
    toastBox.appendChild(t);
    setTimeout(function () { t.classList.add('hide'); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  function updateCartCount(n) {
    document.querySelectorAll('.cart-count').forEach(function (box) { box.textContent = n; });
  }

  function csrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  /* ---------- 2. Dark / light theme ---------- */
  var themeBtn = document.getElementById('themeToggle');
  function showThemeIcon() {
    if (themeBtn) {
      themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
    }
  }
  if (themeBtn) {
    showThemeIcon();
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('dm_theme', next); } catch (err) { /* ignore */ }
      showThemeIcon();
    });
  }

  /* ---------- 3. Mobile menu ---------- */
  var toggle = document.getElementById('menuToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- 4. Auto-hide flash messages after 4 seconds ---------- */
  document.querySelectorAll('.alert-success, .alert-info').forEach(function (box) {
    setTimeout(function () {
      box.style.opacity = '0';
      setTimeout(function () { box.remove(); }, 400);
    }, 4000);
  });

  /* ---------- 5. Form validation ---------- */
  // Rules: one function per input name. Return an error text, or '' if the value is fine.
  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your full name.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.'; },
    phone: function (v) { return /^01[3-9][0-9]{8}$/.test(v.trim()) ? '' : 'Enter a valid mobile number, e.g. 01712345678.'; },
    address: function (v) { return v.trim().length >= 10 ? '' : 'Please write your full address (at least 10 characters).'; },
    area: function (v) { return v.trim().length >= 2 ? '' : 'Please enter the area.'; },
    order_no: function (v) { return v.trim() !== '' ? '' : 'Please enter the order number.'; }
  };

  function clearError(input) {
    input.classList.remove('field-error');
    var next = input.nextElementSibling;
    if (next && next.classList.contains('error-text')) { next.remove(); }
  }

  function showError(input, message) {
    clearError(input);
    if (message === '') { return; }
    input.classList.add('field-error');
    input.insertAdjacentElement('afterend', el('span', 'error-text', message));
  }

  function validateInput(form, input) {
    var value = input.value;
    var message = '';
    if (input.name === 'password') {
      // login: just required. register: at least 6 characters
      message = form.id === 'registerForm'
        ? (value.length >= 6 ? '' : 'Password must be at least 6 characters.')
        : (value !== '' ? '' : 'Please enter your password.');
    } else if (input.name === 'confirm') {
      var pass = form.querySelector('[name="password"]');
      message = pass && value === pass.value ? '' : 'Passwords do not match.';
    } else if (rules[input.name]) {
      message = rules[input.name](value);
    }
    showError(input, message);
    return message === '';
  }

  // Forms that have the "novalidate" attribute use our JavaScript validation
  document.querySelectorAll('form[novalidate]').forEach(function (form) {
    var inputs = form.querySelectorAll('input[name], textarea[name]');
    var skip = function (input) {
      return input.type === 'hidden' || input.type === 'radio' || input.type === 'checkbox' || input.name === 'note' || input.name === 'message';
    };

    inputs.forEach(function (input) {
      if (skip(input)) { return; }
      // check when the user leaves the field, and clear the error while typing
      input.addEventListener('blur', function () {
        if (input.value !== '') { validateInput(form, input); }
      });
      input.addEventListener('input', function () { clearError(input); });
    });

    form.addEventListener('submit', function (event) {
      var firstBad = null;
      inputs.forEach(function (input) {
        if (skip(input)) { return; }
        if (!validateInput(form, input) && !firstBad) { firstBad = input; }
      });
      if (firstBad) {
        event.preventDefault();       // do not send the form
        firstBad.focus();
      }
    });
  });

  /* ---------- 6. Live total on the checkout page ---------- */
  var summary = document.getElementById('checkoutSummary');
  if (summary) {
    var subtotal = parseFloat(summary.dataset.subtotal) || 0;
    var discount = parseFloat(summary.dataset.discount) || 0;
    var inside = parseFloat(summary.dataset.inside) || 0;
    var outside = parseFloat(summary.dataset.outside) || 0;
    var freeOver = parseFloat(summary.dataset.freeOver) || 0;
    var deliveryBox = document.getElementById('deliveryAmount');
    var totalBox = document.getElementById('grandTotal');

    var taka = function (n) { return '৳' + (Math.round(n * 100) / 100).toLocaleString('en-US'); };

    var update = function () {
      var checked = document.querySelector('input[name="area"]:checked');
      var area = checked ? checked.value : 'inside';
      var delivery = area === 'outside' ? outside : inside;
      if (freeOver > 0 && subtotal >= freeOver) { delivery = 0; }
      deliveryBox.textContent = delivery === 0 ? 'Free' : taka(delivery);
      totalBox.textContent = taka(subtotal - discount + delivery);
    };

    document.querySelectorAll('input[name="area"]').forEach(function (radio) {
      radio.addEventListener('change', update);
    });
    update();
  }

  // Stop double clicks on "Place order"
  var checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', function (event) {
      if (event.defaultPrevented) { return; }
      var btn = checkoutForm.querySelector('button.btn-primary');
      if (btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }
    });
    // if the user comes back with the browser Back button, the button must work again
    window.addEventListener('pageshow', function () {
      var btn = checkoutForm.querySelector('button.btn-primary');
      if (btn) { btn.disabled = false; btn.textContent = 'Place order'; }
    });
  }

  /* ---------- 7. Add to cart without page reload ---------- */
  function bindAjaxCart(form) {
    if (form.dataset.bound) { return; }
    form.dataset.bound = '1';

    form.addEventListener('submit', function (event) {
      if (!window.fetch || !window.FormData) { return; }   // old browser: normal form submit
      event.preventDefault();

      var btn = form.querySelector('button:not([type="button"])');
      var oldText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }

      // NOTE: form.getAttribute('action') because the form has an input named "action"
      fetch(form.getAttribute('action'), {
        method: 'POST',
        body: new FormData(form),
        headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' },
        credentials: 'same-origin'
      })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (typeof data.count === 'number') { updateCartCount(data.count); }
          toast(data.message || 'Done.', data.ok ? 'success' : 'info');
        })
        .catch(function () {
          form.submit();                                    // something failed: do it the normal way
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = oldText; }
        });
    });
  }
  document.querySelectorAll('form[data-ajax-cart]').forEach(bindAjaxCart);

  /* ---------- 8. Live search suggestions ---------- */
  var searchForm = document.querySelector('form.search[data-suggest-url]');
  var searchInput = document.getElementById('searchInput');
  var suggestBox = document.getElementById('suggest');
  if (searchForm && searchInput && suggestBox && window.fetch) {
    var suggestTimer = null;
    var suggestRequest = 0;

    var hideSuggest = function () { suggestBox.hidden = true; suggestBox.innerHTML = ''; };

    var showSuggest = function (items) {
      suggestBox.innerHTML = '';
      if (!items.length) {
        suggestBox.appendChild(el('li', 'suggest-empty', 'No products found'));
      }
      items.forEach(function (item) {
        var li = el('li');
        var a = el('a');
        a.href = item.url;
        var pic = el('span', 'suggest-pic');
        if (item.image) {
          var img = el('img');
          img.src = item.image;
          img.alt = '';
          pic.appendChild(img);
        } else {
          pic.textContent = item.emoji;
        }
        var text = el('span', 'suggest-text');
        text.appendChild(el('strong', '', item.name));
        text.appendChild(el('small', '', item.unit));
        a.appendChild(pic);
        a.appendChild(text);
        a.appendChild(el('span', 'suggest-price', item.price));
        li.appendChild(a);
        suggestBox.appendChild(li);
      });
      suggestBox.hidden = false;
    };

    searchInput.addEventListener('input', function () {
      clearTimeout(suggestTimer);
      var q = searchInput.value.trim();
      if (q.length < 2) { hideSuggest(); return; }
      suggestTimer = setTimeout(function () {
        var mine = ++suggestRequest;                        // ignore answers that arrive late
        fetch(searchForm.dataset.suggestUrl + '?q=' + encodeURIComponent(q), {
          headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' }
        })
          .then(function (r) { return r.json(); })
          .then(function (data) { if (mine === suggestRequest) { showSuggest(data.items || []); } })
          .catch(function () { hideSuggest(); });
      }, 250);
    });

    // keyboard: arrow keys move through the suggestions, Escape closes them
    searchForm.addEventListener('keydown', function (event) {
      var anchors = Array.prototype.slice.call(suggestBox.querySelectorAll('a'));
      var index = anchors.indexOf(document.activeElement);
      if (event.key === 'Escape') { hideSuggest(); searchInput.focus(); }
      if (event.key === 'ArrowDown' && anchors.length) { event.preventDefault(); anchors[Math.min(index + 1, anchors.length - 1)].focus(); }
      if (event.key === 'ArrowUp' && anchors.length) {
        event.preventDefault();
        if (index <= 0) { searchInput.focus(); } else { anchors[index - 1].focus(); }
      }
    });

    document.addEventListener('click', function (event) {
      if (!searchForm.contains(event.target)) { hideSuggest(); }
    });
  }

  /* ---------- 9. Wishlist ---------- */
  var WISH_KEY = 'dm_wishlist';

  function getWish() {
    try {
      var list = JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
      return Array.isArray(list) ? list.map(Number).filter(function (n) { return n > 0; }) : [];
    } catch (err) { return []; }
  }

  function setWish(list) {
    try { localStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch (err) { /* ignore */ }
  }

  // update hearts and the counter in the menu
  function refreshWish() {
    var list = getWish();
    document.querySelectorAll('.wish-count').forEach(function (box) { box.textContent = list.length; });
    document.querySelectorAll('[data-wish]').forEach(function (btn) {
      var on = list.indexOf(Number(btn.dataset.wish)) !== -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('on', on);
      if (btn.classList.contains('wish-btn')) {
        btn.textContent = on ? '♥ In wishlist' : '♡ Wishlist';
      } else {
        btn.textContent = on ? '♥' : '♡';
        btn.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Add to wishlist');
      }
    });
  }

  // one click handler for all heart buttons (also the ones created later by JavaScript)
  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-wish]');
    if (!btn) { return; }
    event.preventDefault();
    var id = Number(btn.dataset.wish);
    var list = getWish();
    var pos = list.indexOf(id);
    if (pos === -1) { list.push(id); toast('Saved to wishlist ♥'); } else { list.splice(pos, 1); toast('Removed from wishlist', 'info'); }
    setWish(list);
    refreshWish();
    if (document.getElementById('wishlistGrid')) { renderWishlist(); }
  });

  // build one product card from the JSON sent by api/products.php
  function buildCard(item, cartUrl) {
    var card = el('article', 'card product-card');

    var pic = el('div', 'pic');
    var link = el('a');
    link.href = item.url;
    if (item.image) {
      var img = el('img');
      img.src = item.image;
      img.alt = item.name;
      img.loading = 'lazy';
      link.appendChild(img);
    } else {
      link.appendChild(el('span', 'emoji', item.emoji));
    }
    pic.appendChild(link);
    var heart = el('button', 'wish', '♥');
    heart.type = 'button';
    heart.dataset.wish = item.id;
    pic.appendChild(heart);
    card.appendChild(pic);

    var body = el('div', 'card-body');
    if (item.is_rx) {
      var badges = el('div', 'badges');
      badges.appendChild(el('span', 'badge badge-rx', 'Rx'));
      body.appendChild(badges);
    }
    var h3 = el('h3');
    var a = el('a', '', item.name);
    a.href = item.url;
    h3.appendChild(a);
    body.appendChild(h3);
    body.appendChild(el('p', 'muted small', item.unit));

    var price = el('p', 'price');
    price.appendChild(el('strong', '', item.price));
    if (item.old_price) { price.appendChild(el('s', 'muted small', item.old_price)); }
    body.appendChild(price);

    if (item.in_stock) {
      var form = el('form');
      form.method = 'post';
      form.setAttribute('action', cartUrl);
      form.setAttribute('data-ajax-cart', '');
      [['csrf', csrfToken()], ['action', 'add'], ['product_id', item.id]].forEach(function (pair) {
        var input = el('input');
        input.type = 'hidden';
        input.name = pair[0];
        input.value = pair[1];
        form.appendChild(input);
      });
      var add = el('button', 'btn btn-primary btn-block', 'Add to cart');
      form.appendChild(add);
      bindAjaxCart(form);
      body.appendChild(form);
    } else {
      var out = el('button', 'btn btn-disabled', 'Out of stock');
      out.disabled = true;
      body.appendChild(out);
    }
    card.appendChild(body);
    return card;
  }

  // wishlist page
  var wishGrid = document.getElementById('wishlistGrid');
  var wishEmpty = document.getElementById('wishlistEmpty');
  function renderWishlist() {
    var ids = getWish();
    wishGrid.innerHTML = '';
    if (!ids.length) { wishEmpty.hidden = false; return; }
    wishEmpty.hidden = true;

    fetch(wishGrid.dataset.api + '?ids=' + ids.join(','), { headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = data.items || [];
        // forget products that no longer exist
        setWish(items.map(function (i) { return i.id; }));
        wishGrid.innerHTML = '';
        if (!items.length) { wishEmpty.hidden = false; }
        items.forEach(function (item) { wishGrid.appendChild(buildCard(item, wishGrid.dataset.cart)); });
        refreshWish();
      })
      .catch(function () { toast('Could not load your wishlist. Please try again.', 'info'); });
  }
  if (wishGrid && wishEmpty) { renderWishlist(); }
  refreshWish();

  /* ---------- 10. Quantity + / - buttons and back-to-top ---------- */
  document.querySelectorAll('input[type="number"][data-stepper]').forEach(function (input) {
    var wrap = el('span', 'stepper');
    var minus = el('button', 'step-btn', '−');
    var plus = el('button', 'step-btn', '+');
    minus.type = 'button';
    plus.type = 'button';
    minus.setAttribute('aria-label', 'Decrease quantity');
    plus.setAttribute('aria-label', 'Increase quantity');
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(minus);
    wrap.appendChild(input);
    wrap.appendChild(plus);

    var change = function (delta) {
      var min = input.min !== '' ? Number(input.min) : 0;
      var max = input.max !== '' ? Number(input.max) : 99;
      var next = (Number(input.value) || 0) + delta;
      input.value = Math.max(min, Math.min(max, next));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    minus.addEventListener('click', function () { change(-1); });
    plus.addEventListener('click', function () { change(1); });
  });

  var topBtn = el('button', 'back-top', '↑');
  topBtn.type = 'button';
  topBtn.setAttribute('aria-label', 'Back to top');
  topBtn.hidden = true;
  document.body.appendChild(topBtn);
  window.addEventListener('scroll', function () { topBtn.hidden = window.scrollY < 600; }, { passive: true });
  topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

});
