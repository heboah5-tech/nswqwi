import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const paymentLabels = {
  cod: "كاش عند الاستلام",
  credit: "بطاقة ائتمانية",
};

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.Order.list("-created_date", 100)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    await base44.entities.Order.update(id, { status });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    revenue: orders.reduce((s, o) => s + (o.total || 0), 0),
  };

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-extrabold text-foreground mb-6">لوحة تحكم الطلبات</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "إجمالي الطلبات", value: stats.total, color: "text-foreground" },
            { label: "قيد الانتظار", value: stats.pending, color: "text-yellow-600" },
            { label: "مؤكدة", value: stats.confirmed, color: "text-blue-600" },
            { label: "إجمالي المبيعات", value: `${stats.revenue.toLocaleString("ar-SA")} ر.س`, color: "text-green-600" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">لا توجد طلبات بعد</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {["الاسم", "الجوال", "المدينة", "طريقة الدفع", "الإجمالي", "الحالة", "تاريخ الطلب", "إجراءات"].map(h => (
                      <th key={h} className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, i) => (
                    <tr key={order.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 font-medium">{order.name}</td>
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">{order.phone}</td>
                      <td className="px-4 py-3">{order.city}</td>
                      <td className="px-4 py-3">{paymentLabels[order.payment] || order.payment}</td>
                      <td className="px-4 py-3 font-bold">{order.total?.toLocaleString("ar-SA")} ر.س</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColors[order.status] || "bg-muted text-muted-foreground"}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(order.created_date).toLocaleDateString("ar-SA")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => setSelected(order)} className="text-xs text-primary hover:underline">تفاصيل</button>
                          {order.status === "pending" && (
                            <button onClick={() => updateStatus(order.id, "confirmed")} className="text-xs text-blue-600 hover:underline mr-2">تأكيد</button>
                          )}
                          {order.status === "confirmed" && (
                            <button onClick={() => updateStatus(order.id, "delivered")} className="text-xs text-green-600 hover:underline mr-2">تسليم</button>
                          )}
                          {order.status !== "cancelled" && order.status !== "delivered" && (
                            <button onClick={() => updateStatus(order.id, "cancelled")} className="text-xs text-red-500 hover:underline mr-2">إلغاء</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-foreground">تفاصيل الطلب</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["الاسم", selected.name],
                  ["الجوال", selected.phone],
                  ["المدينة", selected.city],
                  ["طريقة الدفع", paymentLabels[selected.payment] || selected.payment],
                ].map(([label, value]) => (
                  <div key={label} className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-0.5">العنوان</p>
                <p className="font-medium">{selected.address}</p>
              </div>

              {selected.notes && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">ملاحظات</p>
                  <p className="font-medium">{selected.notes}</p>
                </div>
              )}

              {/* Items */}
              {selected.items && selected.items.length > 0 && (
                <div>
                  <p className="font-bold text-foreground mb-2">المنتجات ({selected.items.length})</p>
                  <div className="space-y-2">
                    {selected.items.map((item, i) => {
                      const parsed = typeof item === "string" ? JSON.parse(item) : item;
                      return (parsed) && (
                      <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2">
                        {parsed.image_url && <img src={parsed.image_url} alt={parsed.name_ar} className="w-12 h-12 object-contain rounded bg-card shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium line-clamp-2">{parsed.name_ar}</p>
                          <p className="text-xs text-muted-foreground">الكمية: {parsed.qty}</p>
                        </div>
                        <p className="font-bold text-xs shrink-0">{((parsed.price || 0) * parsed.qty).toLocaleString("ar-SA")} ر.س</p>
                      </div>
                    );})}  
                  </div>
                </div>
              )}

              <div className="flex justify-between font-black text-base border-t border-border pt-3">
                <span>الإجمالي</span>
                <span>{selected.total?.toLocaleString("ar-SA")} ر.س</span>
              </div>

              {/* Status Actions */}
              <div className="flex gap-2 flex-wrap pt-1">
                {selected.status === "pending" && <Button size="sm" onClick={() => updateStatus(selected.id, "confirmed")}>تأكيد الطلب</Button>}
                {selected.status === "confirmed" && <Button size="sm" onClick={() => updateStatus(selected.id, "delivered")}>تم التوصيل</Button>}
                {selected.status !== "cancelled" && selected.status !== "delivered" && (
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(selected.id, "cancelled")}>إلغاء الطلب</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}