import { dashboardSecretHeaders } from "./dashboardAuth";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  Timestamp,
  type Firestore,
} from "firebase/firestore";

// ──────────────────────────────────────────────────────────────────────────────
// Firebase config (Web SDK) — read from Vite env vars
// ──────────────────────────────────────────────────────────────────────────────
//
// The Web SDK is no longer used for orders: the dashboard receives a live
// NDJSON feed from the api-server (`GET /api/orders/stream`) which uses the
// Firebase Admin SDK server-side. This lets the Firestore security rules deny
// ALL anonymous reads on `orders` so customer phone / address data can't be
// pulled directly from Firestore by anyone who knows the public project ID.
//
// All WRITES — new orders from the storefront checkout AND admin status /
// note updates from the dashboard — already go through the api-server with
// the Admin SDK. The Web SDK init below is kept only for the legacy OTP
// helpers further down (see note there); no orders read paths use it.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env
    .VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
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
  dbInstance = getFirestore(getApp());
  return dbInstance;
}

// ──────────────────────────────────────────────────────────────────────────────
// Order document shape
// ──────────────────────────────────────────────────────────────────────────────

export type OrderEventType =
  | "placed"
  | "payment_submitted"
  | "otp_verified"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "admin_note";

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
  receiptUrl?: string;
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
 * Live subscription to all orders, ordered by createdAt desc.
 *
 * Connects to the api-server's NDJSON stream (`GET /api/orders/stream`),
 * which uses the Firebase Admin SDK server-side. The browser never reads
 * Firestore directly, so the security rules can deny anonymous reads on
 * the `orders` collection (closing the leak of customer phone / address
 * data through the public Firebase project ID).
 *
 * Each line of the response body is one of:
 *   - `[]` / `[{...order}, ...]`  — a full snapshot of all orders.
 *   - `{"__error": "..."}`        — a server-side stream error.
 *   - `""` (heartbeat newline)    — keep-alive; ignored.
 *
 * Reconnects automatically with exponential backoff if the connection
 * drops (network blip, server restart, proxy idle-out).
 */
export function subscribeToOrders(
  cb: (orders: OrderDoc[]) => void,
  onError?: (err: Error) => void,
): () => void {
  let cancelled = false;
  let controller: AbortController | null = null;
  let retryDelay = 1000;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = async (): Promise<void> => {
    if (cancelled) return;
    controller = new AbortController();
    let response: Response;
    try {
      response = await fetch("/api/orders/stream", {
        method: "GET",
        headers: {
          Accept: "application/x-ndjson",
          ...dashboardSecretHeaders(),
        },
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (err) {
      if (cancelled || (err as { name?: string }).name === "AbortError") return;
      onError?.(err instanceof Error ? err : new Error(String(err)));
      scheduleReconnect();
      return;
    }

    if (!response.ok || !response.body) {
      const message = `HTTP ${response.status}`;
      // 401/403 means the dashboard secret is wrong — surface it but
      // still try to reconnect (the user can re-enter the password and
      // the next attempt will pick up the updated localStorage value).
      onError?.(new Error(message));
      scheduleReconnect();
      return;
    }

    // We have a live connection — reset backoff so the next failure
    // starts retrying quickly.
    retryDelay = 1000;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          const trimmed = line.trim();
          if (!trimmed) continue; // heartbeat
          let parsed: unknown;
          try {
            parsed = JSON.parse(trimmed);
          } catch {
            continue;
          }
          if (
            parsed &&
            typeof parsed === "object" &&
            "__error" in (parsed as Record<string, unknown>)
          ) {
            const msg = String(
              (parsed as { __error: unknown }).__error ?? "stream error",
            );
            onError?.(new Error(msg));
            continue;
          }
          if (Array.isArray(parsed)) {
            cb(parsed as OrderDoc[]);
          }
        }
      }
    } catch (err) {
      if (cancelled || (err as { name?: string }).name === "AbortError") return;
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }

    if (!cancelled) scheduleReconnect();
  };

  const scheduleReconnect = () => {
    if (cancelled) return;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connect();
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 30_000);
  };

  void connect();

  return () => {
    cancelled = true;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
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
