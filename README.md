# DaffoMart (HTML + CSS + JavaScript + Firebase)

A grocery and medicine shop. **No PHP, no MySQL, no build step.** Pure HTML, CSS and JavaScript; Firebase (Authentication + Firestore) is the database. It can be hosted on GitHub + Netlify for free.

## 1. Try it first (demo mode)
Browsers block Firebase on `file://`, so use any small web server:

    python -m http.server 8000      (then open http://localhost:8000)

While `assets/js/config.js` still says `PASTE_YOUR_API_KEY`, the site runs in **demo mode**: sample products, data stored in your browser only. Admin panel: `/admin/` -> `admin@daffomart.test` / `admin123`. Demo mode is for testing only.

## 2. Connect Firebase (use a NEW project)
> Do not reuse a Firebase project that another live site uses: step 4 replaces its security rules.

1. console.firebase.google.com -> Add project (e.g. `daffomart-static`).
2. Build -> **Authentication** -> Get started -> enable **Email/Password**.
3. Build -> **Firestore Database** -> Create database (production mode).
4. Firestore -> **Rules** -> paste `firestore.rules` -> Publish.
5. Project settings -> Your apps -> Web (`</>`) -> copy the config into `assets/js/config.js` (`firebase: {...}`).
6. Authentication -> Settings -> Authorized domains -> add your Netlify domain.

## 3. Make the first admin
1. Open the site, **Register** a normal account.
2. Go to `/admin/` and log in. It shows "No admin access" and your **UID**.
3. Firestore -> Start collection `admins` -> Document ID = that UID -> add field `role` = `admin` -> Save.
4. Reload `/admin/`. On an empty shop press **Load sample data** on the dashboard.

## 4. Edit store details
`assets/js/config.js`: store name, phone, address, delivery charges (inside/outside Dhaka, free-delivery limit), items per page.

## 5. Publish
Push the folder to GitHub, then Netlify -> Add new site -> Import from Git. Build command: empty. Publish directory: `.`
Do not push over a branch that already has a different live site; use a new repo or a new branch.

## File map
- `*.html` - pages. `assets/css/style.css` - all styles.
- `assets/js/core.js` helpers + shop rules; `db.js` all Firebase code; `app.js` header/footer/cart/wishlist; `pages/*.js` one file per page; `admin.js` admin panel; `demo-sdk.js` + `sample-data.js` demo mode.

## Honest limitations (no server)
- Prices, stock and coupons are checked in the browser and by Firestore rules. Rules cannot do everything a server can, so a technical person could abuse the stock/coupon counters. For a real business add Cloud Functions later.
- Order tracking works with order number + phone (the order id is a hash of both). Anyone knowing both can see the order.
- Product images are stored in Firestore (shrunk to 600px) or as pasted links; Firebase Storage is not used.
- Pages are rendered by JavaScript, so search engines and link previews see less than with PHP.
- `apiKey` in config.js is public by design in Firebase web apps; security comes from the rules.
