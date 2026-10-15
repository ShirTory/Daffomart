"use client";
import { useEffect, useState } from "react";
import { useCart, type WishItem } from "@/lib/store";

export default function WishlistButton({ item, className = "" }: { item: WishItem; className?: string }) {
  const toggleWish = useCart((s) => s.toggleWish);
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(useCart.getState().wishlist.some((w) => w.id === item.id)); }, [item.id]);
  return (
    <button
      type="button"
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={on}
      className={`flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 text-lg shadow-sm transition hover:scale-105 ${on ? "border-red-200 text-red-500" : "border-gray-200 text-gray-400 hover:text-red-500"} ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWish(item);
        setOn((v) => !v);
      }}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
