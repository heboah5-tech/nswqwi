import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import CartSidebar from "./CartSidebar";

export default function FloatCart() {
  const [open, setOpen] = useState(false);
  const { count, total } = useCart();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        dir="rtl"
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-2xl hover:bg-primary/90 active:scale-95 transition-all duration-300 group"
      >
        <div className="relative">
          <ShoppingCart className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-300" />
          {count > 0 && (
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-primary">
              {count}
            </span>
          )}
        </div>
        {count > 0 && (
          <span className="text-sm font-bold font-mono">
            {total.toLocaleString("ar-SA")} ر.س
          </span>
        )}
      </button>

      <CartSidebar open={open} onClose={() => setOpen(false)} />
    </>
  );
}