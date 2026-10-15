"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "./types";

interface CartState {
  items: CartItem[]; coupon: string;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  setCoupon: (code: string) => void;
  clear: () => void;
}
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [], coupon: "",
      add: (item, qty = 1) => set((s) => {
        const ex = s.items.find((i) => i.id === item.id);
        const cap = (n: number) => (item.stock ? Math.min(n, item.stock) : n);
        return { items: ex ? s.items.map((i) => (i.id === item.id ? { ...i, ...item, qty: cap(i.qty + qty) } : i)) : [...s.items, { ...item, qty: cap(qty) }] };
      }),
      setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.stock ? Math.min(qty, i.stock) : qty) } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setCoupon: (coupon) => set({ coupon }),
      clear: () => set({ items: [], coupon: "" }),
    }),
    { name: "daffomart-cart", version: 2 }
  )
);

export interface WishItem {
  id: string; slug: string; name: string; price: number; unit: string; emoji: string; image?: string; oldPrice?: number;
}
interface WishState {
  items: WishItem[];
  toggle: (item: WishItem) => void;
  has: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
}
export const useWishlist = create<WishState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => set((s) => {
        const exists = s.items.some((i) => i.id === item.id);
        return { items: exists ? s.items.filter((i) => i.id !== item.id) : [...s.items, item] };
      }),
      has: (id) => get().items.some((i) => i.id === id),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "daffomart-wishlist", version: 1 }
  )
);
