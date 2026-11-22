# DaffoMart — Project Guide (to explain the project to your teacher)

## 1. What is it?
An online shop for **groceries and medicine** (cash on delivery). Customers browse, search, add to cart, use coupons, order and track.
The owner uses an **admin panel** to manage products, stock, orders, customers, offers and settings.

## 2. Technologies
| Part | Language | Job |
|---|---|---|
| Pages | **HTML** | structure of every page |
| Design | **CSS** (`site/assets/css/style.css`) | colours, layout, mobile view, dark mode |
| Behaviour | **JavaScript** (`site/assets/js`) | cart, search, checkout, admin screens; talks to the API with `fetch()` |
| Server | **PHP 8** (`api/`) | business rules, security, database access |
| Database | **MySQL** | stores products, orders, customers, settings |
| Hosting | **Netlify** (website) + **PHP hosting** (API + MySQL) | |

The original project was built with Next.js/TypeScript/Tailwind. This version keeps the same features and the same API shape (`{"ok":true,"data":...}`) but uses only plain HTML/CSS/JS + PHP.

## 3. Big picture
```
 Browser (Netlify)                         PHP hosting
 +-------------------------+   fetch()    +-------------------------------+
 | HTML pages + CSS        | -----------> | api/index.php  (front door)   |
 | JavaScript:             |  JSON        |  -> lib/routes.php (addresses)|
 |  dm.js  shared code     | <----------- |  -> lib/*.php (rules)         |
 |  pages/*.js one per page|              |  -> MySQL (tables docs, ...)  |
 |  admin.js admin panel   |              +-------------------------------+
 +-------------------------+
```
Rule of thumb: **a page = HTML (what is on it) + `pages/<name>.js` (what it does)**. Only `DM.api()` in `dm.js` talks to the server.

## 4. Folder map
```
site/index.html, products.html, product.html, cart.html, checkout.html, order-success.html,
     orders.html, track.html, wishlist.html, medicine.html, contact.html, policy.html, 404.html
site/admin/index.html                 the admin panel (one page; the part after # chooses the screen)
site/assets/css/style.css             all design
site/assets/js/config.js              API address
site/assets/js/dm.js                  shared: api(), cart, wishlist, product card, header/footer, theme, search
site/assets/js/pages/*.js             one file per page
site/assets/js/admin.js               the whole admin panel
api/index.php                         every request enters here
api/lib/routes.php                    list of all API addresses (GET /products, POST /orders ...)
api/lib/db.php                        database access + safe order placing (transaction)
api/lib/services.php                  business rules: create order, status changes, stock, coupons, stats
api/lib/validate.php                  checks every input
api/lib/auth.php                      login (JWT token), roles, audit log
api/lib/settings.php, resources.php, variants.php, customers.php, upload.php, seed.php
api/schema.sql                        the tables
```

## 5. Database idea
Two tables are enough: `docs` (one row per product / order / customer / setting; the data is a JSON column plus 3 indexed search keys) and `rate_limits`.
This "document" style keeps the code very close to the original, which also stored documents. Orders and stock are changed inside an **InnoDB transaction** (`SELECT ... FOR UPDATE`).

## 6. Important flows
**Placing an order** (`create_order` in `services.php`): the browser sends only product ids, quantities and customer details. The server re-reads the **real prices and stock**, checks the coupon, delivery area and payment method, then in **one transaction** checks stock, reduces it and saves the order — all or nothing. Eight simultaneous buyers of 3 remaining items → exactly 3 succeed.
A random *idempotency key* sent with the order makes a double-click or retry return the same order instead of creating two.
**Tracking**: needs both the order number and the phone number. **Cancel**: only while *pending* and within 2 minutes; stock is returned once (a flag stops double restocking).
**Admin login**: email+password → server returns a signed token (JWT, HS256, 12 hours) kept in the browser and sent as `Authorization: Bearer`. Passwords use `password_hash`.
**Security**: all user text is escaped before display (`DM.esc`, prevents XSS); all SQL uses prepared statements (prevents SQL injection); inputs validated on the server; rate limits on login/orders/coupons/tracking; CORS allows only your website; uploads are checked, resized and re-encoded.

## 7. Likely questions
1. **Why not only HTML/CSS/JS?** A shop needs a trusted server for stock, prices and passwords; the browser can be changed by anyone. So PHP + MySQL does the important checks.
2. **Why is Netlify not running PHP?** Netlify hosts static files only. The pages live there; the API lives on a PHP host.
3. **How do you stop two people buying the last item?** A database transaction with row locks (`FOR UPDATE`).
4. **How is the admin protected?** Token login; every admin route calls `require_admin()`; rate-limited; audit log.
5. **Where is the cart?** In the browser (`localStorage`) as product id + quantity; prices are always re-read from the server.
6. **What would you add next?** Rider portal and live GPS, accounting/payroll, online payment gateway, Excel import/export.

## 8. Limits (say them honestly)
Phase 1 only: see `FEATURE-CHECKLIST.md`. Rider/employee portals, finance and payment gateway are not built yet.
