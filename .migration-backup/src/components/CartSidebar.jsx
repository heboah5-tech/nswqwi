import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";

export default function CartSidebar({ open, onClose }) {
  const { items, removeFromCart, updateQty, total } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate("/checkout");
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full sm:w-96 flex flex-col p-0" dir="rtl">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="w-5 h-5 text-primary" />
            سلة التسوق
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">سلتك فارغة</p>
            <p className="text-sm text-muted-foreground/70 mt-1">أضف منتجات لبدء التسوق</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map((item) => {
                const key = item.id || item.name_ar;
                return (
                  <div key={key} className="flex gap-3 bg-muted/40 rounded-xl p-3">
                    <img
                      src={item.image_url}
                      alt={item.name_ar}
                      className="w-16 h-16 object-contain rounded-lg bg-card shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{item.name_ar}</p>
                      <p className="text-primary font-bold mt-1">{item.price?.toLocaleString("ar-SA")} ر.س</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQty(key, item.qty - 1)}
                          className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold w-5 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateQty(key, item.qty + 1)}
                          className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(key)}
                          className="mr-auto text-destructive hover:text-destructive/80 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border px-5 py-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">المجموع</span>
                <span className="font-black text-xl text-foreground">{total.toLocaleString("ar-SA")} ر.س</span>
              </div>
              <Button onClick={handleCheckout} className="w-full h-12 text-base font-bold rounded-xl">
                متابعة الطلب
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}