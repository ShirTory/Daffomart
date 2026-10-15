"use client";
import Link from "next/link";
import { useWishlist, useCart } from "@/lib/store";
import { taka } from "@/lib/format";
import { ProductImage } from "@/components/store/ProductCard";

export default function WishlistPage() {
  const { items, remove, clear } = useWishlist();
  const add = useCart((s) => s.add);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <span className="text-5xl">💚</span>
        <h1 className="text-xl font-bold">Your wishlist is empty</h1>
        <p className="text-sm text-gray-500">Save products you like for later.</p>
        <Link href="/products" className="btn-primary mt-2">Browse products</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wishlist ({items.length})</h1>
        <button onClick={clear} className="btn-ghost btn-sm text-red-600">Clear all</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">
        {items.map((p) => (
          <div key={p.id} className="relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-card">
            <button onClick={() => remove(p.id)} className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-red-500 shadow" aria-label="Remove">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <Link href={`/products/${p.slug}`} className="relative aspect-square bg-primary-soft">
              <ProductImage p={p} />
            </Link>
            <div className="flex flex-1 flex-col p-3">
              <Link href={`/products/${p.slug}`} className="line-clamp-2 text-sm font-semibold hover:text-primary">{p.name}</Link>
              <p className="mt-1 text-lg font-bold text-primary">{taka(p.price)}</p>
              <button
                className="btn-accent btn-sm mt-2 w-full"
                onClick={() => add({ id: p.id, slug: p.slug, name: p.name, price: p.price, unit: p.unit, emoji: p.emoji, image: p.image }, 1)}
              >Add to cart</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
