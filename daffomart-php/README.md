# DaffoMart - PHP version (HTML, CSS, PHP, JavaScript, MySQL)

University web application project: an online grocery and medicine store.
No framework, no Composer, no npm - open the folder in VS Code and every file is plain code you can read and explain.

> This folder lives inside the main DaffoMart repository. The Next.js project in the repository root is unchanged.
> See [FEATURE_COMPARISON.md](FEATURE_COMPARISON.md) for what is (and is not) in this PHP version.

---

## 1. Run it on your computer (XAMPP)

1. Install **XAMPP** and start **Apache** and **MySQL**.
2. Copy this `php-version` folder to `C:\xampp\htdocs\daffomart-php` (you can rename it).
3. Open **http://localhost/phpmyadmin** -> **Import** -> choose `database/schema.sql` -> **Go**.
4. Open **http://localhost/daffomart-php/**

| Part | URL | Login |
|---|---|---|
| Website | `/daffomart-php/` | register a customer account |
| Admin panel | `/daffomart-php/admin/login.php` | `admin@daffomart.test` / `admin123` |
| Sample coupons | enter in the cart | `WELCOME10` (10% off, min 300), `FLAT50` (50 Taka off, min 500) |

Change the admin password in **Admin -> Change password** after the first login. Needs **PHP 7.4 or newer**.

**Settings:** defaults are in `includes/config.php`. To use your own database password or phone number, copy
`includes/config.local.example.php` to `includes/config.local.php` and edit it - that file is ignored by Git,
so secrets never go to GitHub.

---

## 2. Which language is used where (for your teacher)

| Language | What it does here | Main files |
|---|---|---|
| **HTML** | Page structure: header, forms, tables, product cards, JSON-LD | the HTML parts of all `.php` files |
| **CSS** | Colours (CSS variables), flexbox/grid layout, dark mode, responsive menu | `assets/css/style.css` |
| **PHP** | Server logic: database, login, cart, coupons, checkout, admin, security, JSON API | all `.php` files |
| **JavaScript** | Dark mode, mobile menu, form validation, live checkout total, add-to-cart without reload (fetch/AJAX), live search, wishlist, quantity buttons, toast messages | `assets/js/main.js`, `assets/js/admin.js` |
| **MySQL** | users, categories, products, orders, order_items, coupons, rider_applications | `database/schema.sql` |

### Folder map

```
php-version/
|-- index.php            Home page
|-- products.php         Shop: search, category, sort, pagination
|-- product.php          Product details + SEO structured data
|-- cart.php             Cart + coupon (also answers JavaScript with JSON)
|-- checkout.php         Delivery form -> saves the order (database transaction)
|-- order-success.php    Thank-you page         track.php   Track an order
|-- wishlist.php         Wishlist page (data from the browser + api/products.php)
|-- login.php register.php logout.php account.php   Customer accounts
|-- join.php             Rider application      policy.php contact.php   Info pages
|-- sitemap.php robots.txt 404.php              SEO + error page
|-- api/search.php       JSON for live search   api/products.php   JSON for wishlist
|-- includes/            config.php, db.php, functions.php, header.php, footer.php
|-- admin/               login, dashboard (chart), orders, order-view, invoice, export-orders (CSV),
|                        products, product-form, categories, coupons, applications, password
|-- assets/              css/style.css, js/main.js, js/admin.js, img/
|-- uploads/             product images uploaded by the admin
`-- database/schema.sql  tables + sample data
```

### How one request flows (good for the viva)

`Browser -> products.php?cat=veg -> PHP reads the URL -> PDO prepared statement -> MySQL returns rows -> PHP prints HTML -> CSS styles it -> JavaScript adds the interactions.`

### Security points

- **PDO prepared statements** everywhere (no SQL injection) and `e()` = `htmlspecialchars` on every printed value (no XSS).
- **CSRF token** in every POST form (`csrf_field()` / `csrf_check()`), including the JavaScript requests.
- Passwords use **`password_hash` / `password_verify`**; the session cookie is `HttpOnly` + `SameSite`.
- **Prices, stock and coupons are re-checked on the server** at checkout. The browser is never trusted.
- Checkout uses a **transaction + `SELECT ... FOR UPDATE`**: the last item or last coupon use cannot be taken twice.
- Image upload checks the real file type and size and saves under a random name.
- `includes/` and `database/` are blocked from direct browser access (`.htaccess`, Apache).
- PHP errors are hidden on a live server and shown only on `localhost`.

---

## 3. Put it live

**Netlify and GitHub Pages cannot run PHP.** Your Next.js site stays on Netlify as before; this PHP version needs a PHP + MySQL host (InfinityFree, Hostinger, any cPanel hosting).

1. Create a **MySQL database** on the host and note host, name, user, password.
2. In the host's phpMyAdmin **import `database/schema.sql`**. If `CREATE DATABASE` is not allowed, delete the first two lines (`CREATE DATABASE ...` and `USE daffomart;`) and import into the database you created.
3. Create `includes/config.local.php` (from the example file) with those database values.
4. Upload the folder contents to `htdocs` / `public_html`. Make `uploads/` writable (755 or 775).
5. Open `/admin/login.php` and **change the admin password**.
6. In `robots.txt` add your real `Sitemap:` line, and submit `https://YOUR-DOMAIN/sitemap.php` in Google Search Console.

## 4. Testing status

- **JavaScript is tested** in a real browser (Chromium) against a small mock server: dark mode, add to cart without reload, quantity buttons, live search with keyboard, wishlist page (including HTML escaping), checkout live total with coupon, form validation, mobile menu. All passed with no console errors.
- **PHP and MySQL could not be run in the environment where this code was written.** The PHP files were checked for bracket balance and undefined function calls, and reviewed by hand, but not executed. Please follow the checklist below on your computer first; if a page shows an error, send me the exact message.

Checklist: home loads - search "milk" and see suggestions - add to cart (no reload) - apply `WELCOME10` in the cart - checkout with `01712345678` - order number appears - track it - admin login - change status - cancel (stock returns) - add a product with image - add a coupon - print an invoice - export CSV - send a rider application and approve it in admin.
