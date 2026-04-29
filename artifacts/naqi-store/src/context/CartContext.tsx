import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "naqi:cart:v1";

export interface Product {
  id?: string;
  name_ar: string;
  price: number;
  original_price?: number;
  discount?: number;
  image_url: string;
  category?: string;
  in_stock?: boolean;
}

interface CartItem extends Product {
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* quota exceeded or storage unavailable — non-fatal */
    }
  }, [items]);

  const addToCart = (product: Product) => {
    setItems((prev) => {
      const key = product.id || product.name_ar;
      const existing = prev.find((i) => (i.id || i.name_ar) === key);
      if (existing) {
        return prev.map((i) => (i.id || i.name_ar) === key ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (key: string) => {
    setItems((prev) => prev.filter((i) => (i.id || i.name_ar) !== key));
  };

  const updateQty = (key: string, qty: number) => {
    if (qty < 1) { removeFromCart(key); return; }
    setItems((prev) => prev.map((i) => (i.id || i.name_ar) === key ? { ...i, qty } : i));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
