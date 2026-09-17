"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface CartItem {
  photo_id: string;
  event_id: string;
  event_title: string;
  photographer_name: string;
  photographer_id: string;
  price_cents: number;
  watermark_url: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (photo_id: string) => void;
  clearCart: () => void;
  isInCart: (photo_id: string) => boolean;
  totalCents: number;
  count: number;
  hydrated: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "fotonatrip_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.photo_id === item.photo_id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((photo_id: string) => {
    setItems((prev) => prev.filter((i) => i.photo_id !== photo_id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (photo_id: string) => items.some((i) => i.photo_id === photo_id),
    [items]
  );

  const totalCents = items.reduce((sum, item) => sum + item.price_cents, 0);
  const count = items.length;

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, clearCart, isInCart, totalCents, count, hydrated }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
