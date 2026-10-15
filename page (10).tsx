"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/store";
import { taka } from "@/lib/format";

export default function WishlistPage() {
  const { wishlist, removeWish, add } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-40 animate-pulse rounded-2xl bg-gray-200" aria-busy="true" />;
  if (!wishlist.length) {
    return (
      <div className="rounded-2xl border bg-white p-12 text-center shadow-card">
        <p className="text-5xl">♡</p>
        <h1 className="mt-3 text-xl font-bold">Your wishlist is empty</h1>
        <p className="mt-1 text-sm text-gray-500">Tap the heart on any product to save it here.</p>
        <Link href="/products" className="btn-primary mt-5">Browse products</Link>
      </div>
    );
  }
  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Wishlist <span className="text-base font-normal text-gray-500">({wishlist.length})</span></h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {wishlist.map((w) => (
          <div key={w.id} className="flex gap-3 rounded-2xl border bg-white p-3 shadow-card">
            <Link href={`/products/${w.slug}`} className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-soft text-3xl">
              {w.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={w.image} alt="" className="h-full w-full object-cover" /> : w.emoji}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/products/${w.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-primary">{w.name}</Link>
              <p className="text-xs text-gray-500">{w.unit}</p>
              <p className="mt-1 font-bold text-primary">{taka(w.price)}{w.oldPrice ? <span className="ml-1 text-xs font-normal text-gray-400 line-through">{taka(w.oldPrice)}</span> : null}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-accent btn-sm" onClick={() => add({ id: w.id, slug: w.slug, name: w.name, price: w.price, unit: w.unit, emoji: w.emoji, image: w.image })}>Add to cart</button>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => removeWish(w.id)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
