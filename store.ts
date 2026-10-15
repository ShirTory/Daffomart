"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "./types";

export interface WishItem {
  id: string; slug: string; name: string; price: number; unit: string;
  emoji: string; image?: string; oldPrice?: number;
}

interface CartState {
  items: CartItem[]; coupon: string;
  wishlist: WishItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  setCoupon: (code: string) => void;
  clear: () => void;
  toggleWish: (item: WishItem) => void;
  removeWish: (id: string) => void;
  isWished: (id: string) => boolean;
}
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [], coupon: "", wishlist: [],
      add: (item, qty = 1) => set((s) => {
        const ex = s.items.find((i) => i.id === item.id);
        const cap = (n: number) => (item.stock ? Math.min(n, item.stock) : n);
        return { items: ex ? s.items.map((i) => (i.id === item.id ? { ...i, ...item, qty: cap(i.qty + qty) } : i)) : [...s.items, { ...item, qty: cap(qty) }] };
      }),
      setQty: (id, qty) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.stock ? Math.min(qty, i.stock) : qty) } : i)) })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setCoupon: (coupon) => set({ coupon }),
      clear: () => set({ items: [], coupon: "" }),
      toggleWish: (item) => set((s) => {
        const has = s.wishlist.some((w) => w.id === item.id);
        return { wishlist: has ? s.wishlist.filter((w) => w.id !== item.id) : [...s.wishlist, item] };
      }),
      removeWish: (id) => set((s) => ({ wishlist: s.wishlist.filter((w) => w.id !== id) })),
      isWished: (id) => get().wishlist.some((w) => w.id === id),
    }),
    { name: "daffomart-cart", version: 3 }
  )
);
