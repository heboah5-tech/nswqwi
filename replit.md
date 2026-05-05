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
The browser **never reads or writes the `orders` collection directly**. The dashboard polls the api-server's `GET /api/orders` snapshot endpoint every 4 seconds (gated by `X-Dashboard-Secret`); the server uses the Firebase Admin SDK to read orders. A live NDJSON stream (`GET /api/orders/stream`) is also exposed for the standalone Replit deploy, but the client uses polling for portability across hosting (the Netlify Functions deploy buffers responses and cannot keep a long-lived stream open). This closes the data leak that previously let anyone with the public Firebase project ID query customer phone / address fields. New orders from checkout and admin status / note changes also go through `api-server` with the Admin SDK.

`artifacts/naqi-store/firestore.rules` enforces this: **all client access to `orders` is denied** (read and write); `products` remains client-readable for forward compatibility but client writes are denied. Deploy them via the Firebase console (Build → Firestore Database → Rules) or `firebase deploy --only firestore:rules`.

## Geo-Firewall (Saudi Arabia only)

The storefront is locked to **Saudi Arabia** by a server-side geo-firewall plus a frontend gate. Visitors from any other country see an Arabic "service not available in your region" page instead of the storefront.

- **Server**: `artifacts/api-server/src/middlewares/geoBlockMiddleware.ts` — applied to every `/api/*` route except `/api/healthz`, `/api/geo/*`, and any request carrying `X-Dashboard-Secret` (operator bypass — admin can manage orders while travelling). Country detection order: localhost / RFC1918 → "LOCAL" (always allowed) → edge headers (`CF-IPCountry`, `x-vercel-ip-country`, `x-country`, `x-nf-country`, `x-geo-country`) → fallback HTTP lookup against `https://api.country.is/{ip}` with a 1-hour in-memory LRU cache (max 5000 entries). Network/timeout failures return `"??"` and are blocked.
- **Public read endpoint**: `GET /api/geo/check` returns `{enabled, country, allowed, allowedCountry, source}` — used by the frontend gate. Mounted **before** the block middleware so it stays reachable from any country.
- **Frontend gate**: `artifacts/naqi-store/src/components/GeoGate.tsx` wraps `<Router />` in `App.tsx`. On mount it calls `/api/geo/check` and either renders children or replaces the screen with a full-screen Arabic block page. Routes starting with `/dashboard` bypass the gate entirely. Network errors fail OPEN (server middleware is still authoritative).
- **Toggle**: env var `GEO_BLOCK_ENABLED` — defaults to **on** (any value other than `false`/`0`/`off`/`no` enables it). Set `GEO_BLOCK_ENABLED=false` for local dev from outside SA. The Netlify deploy section below lists this with the other prod env vars.

## API Routes

- `GET /api/products` — list products from Firestore (public). On first call, the `products` collection is auto-seeded with 12 hardcoded products if empty.
- `POST /api/products` — create product (admin)
- `PATCH /api/products/:id` — update product (admin)
- `DELETE /api/products/:id` — delete product (admin)
- `GET /api/categories` — static category list (public)
- `POST /api/orders` — create order (public, used at checkout). Validates payload with Zod and writes via Firebase Admin SDK. Accepts an optional `events: [{type, message}]` array of customer-driven events (`payment_submitted`, `otp_verified`) to attach atomically alongside the auto-generated `placed` event.
- `PATCH /api/orders/:id/status` — change status, append matching status event, sync `shipping.status` (gated by `X-Dashboard-Secret`)
- `POST /api/orders/:id/admin-notes` — append `admin_note` event (gated by `X-Dashboard-Secret`)
- `GET /api/orders` — one-shot snapshot of all orders ordered by `createdAt desc` (gated by `X-Dashboard-Secret`). Used by the dashboard's polling loop. Identical payload shape to each frame emitted by `/orders/stream`.
- `GET /api/orders/stream` — long-lived NDJSON stream of all orders for the dashboard (gated by `X-Dashboard-Secret`). Each line is a JSON-encoded `OrderDoc[]` snapshot pushed on every Firestore change, with a single-`\n` heartbeat every 25s. Available on the standalone Replit deploy; **does not work on Netlify** (Functions buffer responses).
- `POST /api/admin/dashboard/verify` — body `{ secret }`; returns 200 if it matches `DASHBOARD_SECRET`, 401 otherwise. Used by the dashboard password gate.
- `GET /api/geo/check` — geo-firewall status for the current visitor: `{enabled, country, allowed, allowedCountry, source}`. Public, never blocked.
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
- `pnpm --filter @workspace/api-server run build:netlify` — bundle the Express app into `netlify/functions/api.mjs` (single self-contained ESM file, ~8 MB)

## Deployment — Netlify (all-in-one)

The repo is configured to deploy **everything** to Netlify: the React frontend as a static site, and the Express API wrapped as a single Netlify Function via `serverless-http`.

### Files
- `netlify.toml` (root) — build command, function dir, env vars, `/api/*` → `/.netlify/functions/api/api/:splat` redirect, SPA fallback redirect.
- `artifacts/api-server/src/serverlessHandler.ts` — wraps the Express app with `serverless-http` and exports `handler`.
- `artifacts/api-server/build-netlify.mjs` — esbuild bundler that produces `netlify/functions/api.mjs`. Configured with `node_bundler = "none"` in `netlify.toml` so Netlify ships our pre-bundled file as-is.

### Required Netlify environment variables (Site settings → Environment variables)
Copy these from the Replit Secrets pane. Mark each as available to **Builds + Functions**.
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY` (build-time, frontend)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (full single-line JSON)
- `FIREBASE_STORAGE_BUCKET`
- `DASHBOARD_SECRET`
- `GEO_BLOCK_ENABLED` — set to `true` (default) to enforce SA-only access; set to `false` to disable the firewall.

`netlify.toml` also pins `NODE_VERSION=20`, `NETLIFY=true`, `NODE_ENV=production`, `PORT=8080`, and `BASE_PATH=/` for the build.

### Connect & deploy
1. Push the repo to GitHub.
2. In Netlify: **Add new site → Import from Git** → pick the repo. Netlify detects `netlify.toml` automatically.
3. Add the env vars above.
4. Hit **Deploy**. The build runs `corepack enable && pnpm install && build:netlify && vite build`.

### Netlify-specific downgrades (vs. the Replit deploy)
The Express app was designed for a long-running Node server; serverless wrapping required these compromises:
1. **No live order stream.** The dashboard now polls `GET /api/orders` every 4 seconds instead of subscribing to the NDJSON stream. New orders / OTP requests appear up to ~4s late instead of instantly.
2. **No Clerk Frontend API proxy.** `clerkProxyMiddleware` is skipped when `process.env.NETLIFY === "true"`. Custom domains using Clerk auth need DNS CNAME setup instead of "just working".
3. **Receipt upload limit dropped from 5 MB → 4 MB** to stay under Netlify Functions' ~6 MB request body limit (after multipart + base64 overhead).
4. **No pino-http request logging** in functions (worker-thread transports don't run in Lambda). The base `pino` logger still works for direct `logger.info(...)` calls.
5. **Cold starts** of ~1–2 s on the first request after the function goes idle (Firebase Admin SDK initialization).

If you later want all of this back, deploy on Replit Deployments — the Express server runs as-is.
