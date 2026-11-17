# Feature comparison: original Next.js project vs this PHP version

The original Next.js project in the repository root is **unchanged** and is still the full DaffoMart system
(Netlify deploy, Firebase, admin/rider/employee portals, finance). This `php-version/` folder is a separate,
smaller project built only with **HTML, CSS, PHP, JavaScript and MySQL** for the university course.
The comparison below is based on the routes, API files and components in the uploaded zip.

Legend: ✅ available · 🟡 simpler version · ➖ not in this PHP version (still in the Next.js project)

## Customer website

| Feature | Next.js (original) | PHP version |
|---|---|---|
| Home page, categories, featured products, medicine section | ✅ | ✅ |
| Search and filters | ✅ | ✅ search, category, medicine/grocery, sort, pagination |
| Live search suggestions | ✅ | ✅ |
| Product details | ✅ | ✅ + Google structured data (JSON-LD) |
| Product variants (size/weight/colour price) | ✅ | ➖ |
| Offers / Super Deals carousel | ✅ | 🟡 old price + "% off" badge |
| Cart | ✅ | ✅ (AJAX add, quantity +/-) |
| Coupons | ✅ | ✅ (percent / fixed, minimum order, expiry, usage limit) |
| Checkout, cash on delivery, delivery zones | ✅ | ✅ inside / outside Dhaka |
| Online payment (bKash/Nagad/gateway) | ✅ | ➖ |
| Order tracking | ✅ | ✅ (order number + phone) |
| Customer account, my orders | ✅ | ✅ register / login |
| Wishlist | ✅ | ✅ (saved in the browser) |
| Product ratings | ✅ | ➖ |
| Rider registration + admin approval | ✅ (with private NID upload) | 🟡 application form + approve/reject (no NID upload) |
| Contact, delivery info, policy pages | ✅ | ✅ |
| Dark mode | 🟡 only a little `dark:` styling found | ✅ switch button, remembers choice |
| SEO: meta tags, Open Graph, sitemap, robots | ✅ | ✅ (`sitemap.php`, `robots.txt`, canonical, OG, JSON-LD) |
| Installable app (PWA manifest) | ✅ | ➖ |
| 404 page | ✅ | ✅ |

## Admin

| Feature | Next.js (original) | PHP version |
|---|---|---|
| Dashboard | ✅ | ✅ totals + 7-day sales chart + low stock |
| Orders: list, status, cancel | ✅ | ✅ (cancel returns stock and coupon use) |
| Invoice printing | ✅ | ✅ |
| Rider assignment to orders | ✅ | ➖ |
| Products: add / edit / delete, images | ✅ multi-image | 🟡 one image |
| Categories | ✅ with reorder | ✅ with sort number |
| Coupons / offers | ✅ | ✅ coupons |
| Excel import / export | ✅ | 🟡 CSV export of orders |
| Inventory, SKU | ✅ | 🟡 stock number + low-stock list |
| Customers (CRM), notes | ✅ | ➖ |
| Delivery zones, couriers | ✅ | 🟡 two fixed charges in `config.php` |
| Site appearance / theme / content editor | ✅ | ➖ |
| Finance: cash-flow, payroll, purchases, P&L | ✅ | ➖ |
| Employees, attendance, rider earnings, live GPS | ✅ | ➖ |
| WhatsApp / calling integrations | ✅ | ➖ |
| Audit log, IT-support roles | ✅ | ➖ |

## Why some things are not in the PHP version
They need Firebase, payment gateways, maps/GPS or large amounts of code that do not fit a
HTML/CSS/PHP/JavaScript course project. They all continue to work in the Next.js project.
