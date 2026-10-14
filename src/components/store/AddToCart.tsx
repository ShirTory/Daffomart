"use client";
import { useState } from "react";
import { useCart } from "@/lib/store";
import type { Product } from "@/lib/types";

export default function AddToCart({ product, withQty = false }: { product: Product; withQty?: boolean }) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1); const [done, setDone] = useState(false);
  const out = product.stock <= 0;
  const onAdd = () => {
    add({ id: product.id, slug: product.slug, name: product.name, price: product.price, unit: product.unit, emoji: product.emoji, image: product.image, stock: product.stock, rx: product.prescriptionRequired }, qty);
    setDone(true); setTimeout(() => setDone(false), 1400);
  };
  return (
    <div className="flex items-center gap-3">
      {withQty && !out && (
        <div className="flex items-center rounded-lg border bg-white">
          <button className="px-3 py-2 text-lg hover:bg-gray-50" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
          <span className="w-8 text-center text-sm font-semibold">{qty}</span>
          <button className="px-3 py-2 text-lg hover:bg-gray-50" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Increase">+</button>
        </div>)}
      <button className={`${done ? "btn bg-emerald-600 text-white" : "btn-accent"} flex-1`} disabled={out} onClick={onAdd}>{out ? "Out of stock" : done ? "Added ✓" : "Add to cart"}</button>
    </div>
  );
}
