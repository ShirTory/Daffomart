# DaffoMart Upgrade Report

Date: 2026-10-15

## Approach
Inspected the existing Next.js 15 + Firebase Admin + Zustand + Tailwind stack and **upgraded in place** without rebuilding. All existing admin, rider, payments, inventory, banners/covers, and API routes were preserved.

## Completed features (implemented in this upgrade)

### 1. Order cancellation (customer, 2-minute window)
- Backend: `cancelOrderByCustomer()` in `src/server/services.ts`
  - Requires order number + phone
  - Only while status is `pending` or `confirmed`
  - Only within **2 minutes** of `createdAt`
  - Restores stock via existing `setOrderStatus(..., "cancelled")`
- API: `POST /api/orders/cancel` (rate-limited)
- Track page: countdown + Cancel button, success message

### 2. Order tracking improvements
- Track API returns `eta` (from delivery zone), `canCancel`, `cancelEndsAt`
- Track UI shows estimated delivery time, rider name/phone (existing), live map (existing)
- **Reorder** button adds order items back to cart

### 3. Wishlist
- Zustand store extended with `wishlist` (persisted, version 3)
- Heart button on product cards (`WishlistButton`)
- `/wishlist` page: list, add to cart, remove
- Header + footer links and badge count

### 4. My Orders
- API: `GET /api/orders/my?phone=` (last 20 orders for that phone, rate-limited)
- `/orders` page: phone lookup, status, track link, reorder
- Header + footer links

### 5. Product cards / UX polish
- Low-stock badge (“Only N left” when stock ≤ 5)
- Wishlist heart on cards
- Search and category nav already present; accessibility labels improved on header search and track form

### 6. SEO / robots
- `/wishlist` and `/orders` added to `robots.txt` disallow (same as cart/checkout/track)

## Already present (verified, not rewritten)
- Homepage: hero slider / fallback, categories, featured / sale / best sellers / new arrivals, medicine section, offers
- Cart: quantity controls, coupons, order summary
- Checkout: customer details, zones/delivery charges, COD / bKash / Nagad / online, geo pin, server-side price/stock/coupon validation
- Admin: products, categories, inventory, orders + rider assignment, riders + applications, delivery zones, cover images (full CRUD: upload, preview, edit, activate/deactivate, delete, sort order), offers/coupons, content, settings
- Rider app: register, login, assigned orders, GPS, status updates
- Backend validation of prices, stock, coupons on order create; stock restore on cancel/return

## Changed / new files
| File | Change |
|------|--------|
| `src/server/services.ts` | + `cancelOrderByCustomer` |
| `src/app/api/orders/cancel/route.ts` | **New** |
| `src/app/api/orders/track/route.ts` | + eta, canCancel, cancelEndsAt |
| `src/app/api/orders/my/route.ts` | **New** |
| `src/components/store/TrackForm.tsx` | Cancel UI, ETA, reorder |
| `src/lib/store.ts` | Wishlist state |
| `src/components/store/WishlistButton.tsx` | **New** |
| `src/components/store/ProductCard.tsx` | Heart + low-stock |
| `src/app/(store)/wishlist/page.tsx` | **New** |
| `src/app/(store)/orders/page.tsx` | **New** |
| `src/components/store/Header.tsx` | Wishlist + My orders |
| `src/components/store/Footer.tsx` | Same links |
| `src/app/robots.ts` | Disallow wishlist/orders |

## Remaining issues / not fully verified in this environment
1. **npm install / build** did not finish in the sandbox (slow network). Run locally: `npm install && npm run lint && npm run build`.
2. **End-to-end tests** (place order → cancel within 2 min → track → reorder → wishlist) require a running app + Firebase or local `.data/` DB.
3. **Reorder** uses product `id` as slug for cart links when reordering from order items (order items do not store slug). Cart/checkout still work because the server validates by product id.
4. **Push / SMS notifications** for customers are not implemented (no third-party SMS gateway in the original stack). Status is visible on Track / My orders with live refresh.
5. **Duplicate order prevention**: rate limit on `POST /api/orders` (10 / 10 min per IP) already exists; no client-side double-submit lock beyond form `isSubmitting`.
6. Cover/poster management was already complete in Admin → Cover Images; no code change required for requirement 6.

## Required Firebase / env configuration
Same as existing `DEPLOYMENT.md`:

```
ADMIN_EMAIL=
ADMIN_PASSWORD=
AUTH_SECRET=          # long random string
NEXT_PUBLIC_SITE_URL=https://your-domain

# Optional Firebase (without these, data is stored in .data/)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Optional payments — see PAYMENTS.md
```

No new env vars were added for this upgrade.

## Deployment steps
1. Copy the upgraded project (or pull these file changes).
2. Set env vars on the host (Netlify / Vercel / Node server).
3. `npm install && npm run build && npm start` (or use Netlify `netlify.toml` as before).
4. Smoke-test:
   - Home, search, add to cart, wishlist heart
   - Checkout → note order number
   - Track with phone → cancel within 2 minutes
   - My orders with same phone → reorder
   - Admin → assign rider → rider updates status → customer sees rider + ETA
   - Admin → Cover Images: upload / reorder / toggle / delete

## Preservation notes
- Technology stack unchanged (Next 15, Firebase Admin, Zustand, Tailwind, zod, jose).
- No new npm dependencies added.
- Existing components and APIs reused; only minimal surface area touched.
