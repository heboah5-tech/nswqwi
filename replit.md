# Workspace — Naqi Store (نقي)

## Overview

Naqi (نقي) is an Arabic e-commerce store for water and air purification products. Migrated from Base44 to Replit's pnpm monorepo stack. Full TypeScript. Arabic RTL layout with Almarai font.

## Artifacts

- `artifacts/naqi-store` — React + Vite + Tailwind v3 frontend (preview at `/`)
- `artifacts/api-server` — Express 5 REST API (preview at `/api`)

## App Pages

- `/` — Home: hero slider, category icons, product sections (public)
- `/products` — Products: filterable grid with search and sort (public)
- `/checkout` — Checkout: multi-step form (with district / postal code / building / floor) → payment selection (cash on delivery, or credit card) → ClickPay-style **card form** → **OTP** verification → **error screen** ("invalid verification code") for both payment methods. The OTP step always fails after a 1.5s "verifying" delay. The order itself is **persisted to Firestore at the moment the card form is submitted** (before OTP), so each attempt is recorded even though the customer-facing OTP screen always errors. **Only safe-to-store card metadata is kept**: the last 4 digits of the PAN (`payment.cardLast4`) and the cardholder name (`payment.cardName`). Full PAN, expiry, and CVV are never transmitted to the API or stored anywhere — the client sends only `cardLast4` (regex-guarded to exactly 4 digits) and the Zod schema on the server rejects anything else.
- `/dashboard` — Admin dashboard, gated by a shared password (`DASHBOARD_SECRET`)
- `/sign-in` — Clerk sign-in page (Arabic branded)
- `/sign-up` — Clerk sign-up page (Arabic branded)

## Auth

Customer and admin auth both handled by **Clerk** (Replit-managed).

### Customer Auth
- `<ClerkProvider>` wraps the entire app in `App.tsx`
- Sign-in at `/sign-in`, sign-up at `/sign-up` using Clerk's components with `routing="path"`
- User icon in header: navigates to `/sign-in` when signed out, shows name + logout when signed in
- Homepage, products, and checkout remain publicly accessible (no forced redirect)

### Admin Auth
- `/dashboard` is gated by a lightweight shared-password screen (`DashboardPasswordGate` in `artifacts/naqi-store/src/components/DashboardPasswordGate.tsx`). The password is stored as the secret env var `DASHBOARD_SECRET`.
- On entry, the gate POSTs the password to `/api/admin/dashboard/verify` and, on 200, caches it in `localStorage["naqi.dashboardSecret.v1"]`. Subsequent admin order requests send it back in the `X-Dashboard-Secret` header (via `dashboardSecretHeaders()` in `src/lib/dashboardAuth.ts`).
- Server-side, `requireDashboardSecret` (`artifacts/api-server/src/middlewares/dashboardSecretMiddleware.ts`) timing-safely compares the header against `DASHBOARD_SECRET` and is applied to `PATCH /api/orders/:id/status` and `POST /api/orders/:id/admin-notes`. Both return 401 without a valid secret.
- The `requireAdmin` middleware in `routes/admin.ts` is still defined and is used by the products endpoints (`POST/PATCH/DELETE /api/products`). Those continue to require Clerk admin role; the Dashboard still sends `Authorization: Bearer <token>` via `useAuth().getToken()` for those calls when the visitor happens to be signed in.

### Granting Admin Access (for product management only)
To make a user an admin: go to the Clerk Dashboard → Users → select user → Public Metadata → set `{"role": "admin"}`. Only required to add/edit/delete products from the dashboard's Products tab.

### Firestore Lockdown
The browser **never reads or writes the `orders` collection directly**. The dashboard receives a live NDJSON feed from the api-server (`GET /api/orders/stream`, gated by `X-Dashboard-Secret`), which uses the Firebase Admin SDK to push a JSON-encoded snapshot of all orders on every Firestore change (plus a `\n` heartbeat every 25s). This closes the data leak that previously let anyone with the public Firebase project ID query customer phone / address fields. New orders from checkout and admin status / note changes also go through `api-server` with the Admin SDK.

`artifacts/naqi-store/firestore.rules` enforces this: **all client access to `orders` is denied** (read and write); `products` remains client-readable for forward compatibility but client writes are denied. Deploy them via the Firebase console (Build → Firestore Database → Rules) or `firebase deploy --only firestore:rules`.

## API Routes

- `GET /api/products` — list products from Firestore (public). On first call, the `products` collection is auto-seeded with 12 hardcoded products if empty.
- `POST /api/products` — create product (admin)
- `PATCH /api/products/:id` — update product (admin)
- `DELETE /api/products/:id` — delete product (admin)
- `GET /api/categories` — static category list (public)
- `POST /api/orders` — create order (public, used at checkout). Validates payload with Zod and writes via Firebase Admin SDK. Accepts an optional `events: [{type, message}]` array of customer-driven events (`payment_submitted`, `otp_verified`) to attach atomically alongside the auto-generated `placed` event.
- `PATCH /api/orders/:id/status` — change status, append matching status event, sync `shipping.status` (gated by `X-Dashboard-Secret`)
- `POST /api/orders/:id/admin-notes` — append `admin_note` event (gated by `X-Dashboard-Secret`)
- `GET /api/orders/stream` — long-lived NDJSON stream of all orders for the dashboard (gated by `X-Dashboard-Secret`). Each line is a JSON-encoded `OrderDoc[]` snapshot pushed on every Firestore change, with a single-`\n` heartbeat every 25s.
- `POST /api/admin/dashboard/verify` — body `{ secret }`; returns 200 if it matches `DASHBOARD_SECRET`, 401 otherwise. Used by the dashboard password gate.
- `POST /api/uploads/receipt` — multipart image upload (any signed-in user); stores file in Firebase Storage under `receipts/<uuid>.<ext>` and returns a public download URL.

### Order Schema (Firestore `orders` collection)

```ts
{
  name: string,
  phone: string,
  shipping: { city, district, postal_code, address, building, floor },
  payment:  { method: "cod" | "credit", status: "unpaid" | "paid", receipt_url },
  items:    [{ name_ar, price, qty, image_url }],
  total: number,
  status: "pending" | "confirmed" | "delivered" | "cancelled",
  notes: string,
  created_date: Timestamp,
}
```

Legacy orders without `shipping`/`payment` sub-objects are read-time normalized.

## Dashboard

`/dashboard` has two tabs:

### Orders (الطلبات) — Telegram-style chat UI
- Two-pane layout: left = chat list (avatar with initials + gradient color, customer name, item preview, status pill, day chip).
- Search and filter chips (الكل / انتظار / مؤكدة / مسلّمة / ملغاة) on the left rail.
- Right pane: a chat conversation rendered for the selected order — incoming bubbles for shipping address, payment method (with receipt thumbnail if present), each line item, and total; outgoing bubble for the admin status response (only after a status change).
- Status changes via "quick reply" chips at the bottom of the conversation.
- Receipt thumbnails are clickable to open a fullscreen lightbox.
- Mobile: list and conversation become a stack — the back arrow returns to the list.

### Products (المنتجات)
- Lists all products with image, category, price, original price, discount, stock status, and Edit/Delete actions.
- Add/Edit modal with name, price, original price, discount, category select, image URL, in-stock toggle.
- Delete uses a native confirm() prompt.

## Environment Secrets

- `CLERK_SECRET_KEY` — auto-provisioned by Clerk setup
- `CLERK_PUBLISHABLE_KEY` — auto-provisioned by Clerk setup
- `VITE_CLERK_PUBLISHABLE_KEY` — auto-provisioned, exposed to frontend build
- `FIREBASE_SERVICE_ACCOUNT_JSON` — full Firebase Admin service account JSON (single-line)
- `FIREBASE_STORAGE_BUCKET` — e.g. `<project-id>.appspot.com` or `<project-id>.firebasestorage.app`
- `ADMIN_SECRET` — legacy, unused after Clerk migration
- `DATABASE_URL` — legacy Postgres URL, **no longer used** by the application after Firestore migration; safe to remove.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite 7 + Tailwind v3 + wouter + @clerk/react + @clerk/themes
- **API framework**: Express 5 + @clerk/express
- **Database**: Firebase Firestore (via firebase-admin SDK on the server)
- **File storage**: Firebase Storage (receipt images uploaded server-side via multer)
- **Validation**: Zod
- **Build**: esbuild (CJS bundle)
- **Font**: Almarai (Arabic web font from Google Fonts)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/naqi-store run dev` — run frontend locally
