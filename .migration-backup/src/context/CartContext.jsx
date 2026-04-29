import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToCart = (product) => {
    setItems(prev => {
      const key = product.id || product.name_ar;
      const existing = prev.find(i => (i.id || i.name_ar) === key);
      if (existing) {
        return prev.map(i => (i.id || i.name_ar) === key ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (key) => {
    setItems(prev => prev.filter(i => (i.id || i.name_ar) !== key));
  };

  const updateQty = (key, qty) => {
    if (qty < 1) { removeFromCart(key); return; }
    setItems(prev => prev.map(i => (i.id || i.name_ar) === key ? { ...i, qty } : i));
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

export function useCart() {
  return useContext(CartContext);
}