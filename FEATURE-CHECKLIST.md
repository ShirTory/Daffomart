# Feature checklist: Next.js original → HTML/CSS/JS + PHP/MySQL

Legend: ✅ done and tested here · 🟡 done, partly tested / simplified · ⏳ planned for the next phase · ❌ not planned

## Phase 1 — Storefront + core admin (this delivery)
### Storefront
| Feature | Status |
|---|---|
| Home page with admin-ordered sections (hero/banner slider, feature boxes, categories, best sellers, daily, fresh, household, offer products, deals & coupons, hot deals, medicine, new arrivals, buy again) | ✅ |
| Shop: category, price, offers-only filters, sort, pages, search + live suggestions | ✅ |
| Medicine page + Rx badge + pharmacist notice | ✅ |
| Product page: pictures, variants (size/weight/colour with own price+stock), related products | ✅ |
| Cart, coupon codes, wishlist, dark mode | ✅ |
| Checkout: delivery areas, free-delivery rule, service charge, COD, manual bKash/Nagad/custom methods with TrxID | ✅ |
| Duplicate-order protection (idempotency key), stock-safe ordering (no overselling, tested with parallel requests) | ✅ |
| Order tracking (order no + phone), 2-minute self-cancel, "My orders" by phone, courier/rider info | ✅ |
| Contact & delivery page, return/exchange policy page (text from admin settings) | ✅ |
| Labels (Best seller / New / % off / Out of stock) with admin rules | 🟡 |
| Online payment gateway | ⏳ ("coming soon" option, like the original) |
| Join-the-team (rider/staff application) page, ratings, issue reports, PWA/install prompt, notifications, Meta Pixel | ⏳ |
### Admin panel
| Feature | Status |
|---|---|
| Owner login (JWT), rate-limited, audit log of logins/changes | ✅ |
| Dashboard: sales, today, pending, 14-day chart, top products, low stock, recent orders | ✅ |
| Orders: filter/search, detail, status flow, payment status, courier + tracking, print, delete; stock is returned on cancel/return | ✅ |
| Products: add/edit/delete, SKU (unique), variants, up to 8 pictures (upload), offer dates, medicine fields | ✅ |
| Inventory: add/remove/set stock + movement log | ✅ |
| Categories, banners, offers & coupons, delivery areas, couriers, extra payment methods | ✅ |
| Customers (CRM): auto-created from orders, segments new/regular/vip/inactive, block, notes, order history | 🟡 (follow-ups API ready, no UI yet) |
| Settings: store info, colours, hero text, feature boxes, home-section order/visibility, payments, policies | 🟡 (advanced theme/fx/deal-badge editors not ported) |
## Phase 2 (next)
Rider portal + rider applications + NID, live GPS map, employee portal + attendance, admin accounts with roles (Owner / Accountant / IT) — the API already understands these roles; the screens are missing.
## Phase 3 (later)
Finance: purchases, suppliers, expenses, payroll, profit & loss · Excel import/export · WhatsApp / calling integrations · online payment gateway · invoice designer · texts editor · customer follow-up UI · ratings & issues.

## Honest notes
* Tested here with PHP 8.3 + MariaDB and a real browser (Chromium): checkout → track → cancel, admin screens, variants, parallel-order stock test.
* **Not tested on a real free PHP host.** Some free hosts add a JavaScript "security check" that blocks API calls from other websites (InfinityFree does). Use a host without it (or a cheap shared host).
* The original's 65 automated tests are not ported.
