"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { discountPct, taka } from "@/lib/format";
import type { Product } from "@/lib/types";
import AddToCart from "./AddToCart";
import { RxBadge } from "./MedicineBadge";
import { useWishlist, useCart } from "@/lib/store";

const optimizable = (src: string) => src.startsWith("/api/uploads/") || src.startsWith("https://firebasestorage.googleapis.com/");
const CARD_SIZES = "(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw";

export function ProductImage({ p, className = "", emojiSize = "text-6xl", priority = false }: { p: Pick<Product, "image" | "emoji" | "name">; className?: string; emojiSize?: string; priority?: boolean }) {
  if (!p.image) return <span className={`${emojiSize} select-none`}>{p.emoji}</span>;
  if (optimizable(p.image)) return <Image src={p.image} alt={p.name} fill sizes={CARD_SIZES} priority={priority} className={`object-cover ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={p.image} alt={p.name} loading="lazy" decoding="async" className={`h-full w-full object-cover ${className}`} />;
}

export default function ProductCard({ p, whatsapp }: { p: Product; whatsapp?: string }) {
  const off = discountPct(p.price, p.oldPrice); const out = p.stock <= 0;
  const { toggle, has } = useWishlist();
  const add = useCart((s) => s.add);
  const router = useRouter();
  const wished = has(p.id);
  const wa = (whatsapp || "").replace(/\D/g, "");

  const buyNow = () => {
    if (out) return;
    add({ id: p.id, slug: p.slug, name: p.name, price: p.price, unit: p.unit, emoji: p.emoji, image: p.image, stock: p.stock, rx: p.prescriptionRequired }, 1);
    router.push("/checkout");
  };

  const wishToggle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    toggle({ id: p.id, slug: p.slug, name: p.name, price: p.price, unit: p.unit, emoji: p.emoji, image: p.image, oldPrice: p.oldPrice });
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
      {off > 0 && <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">-{off}%</span>}
      <button
        onClick={wishToggle}
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110"
      >
        <svg viewBox="0 0 24 24" className={`h-4 w-4 ${wished ? "fill-red-500 text-red-500" : "fill-none text-gray-500"}`} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      <Link href={`/products/${p.slug}`} className="relative flex aspect-square items-center justify-center overflow-hidden bg-primary-soft">
        <ProductImage p={p} className="transition duration-300 group-hover:scale-105" />
        {out && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-bold text-gray-700">Out of stock</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/products/${p.slug}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-gray-900 hover:text-primary">{p.name}</Link>
        {p.genericName && <p className="line-clamp-1 text-[11px] italic text-gray-400">{p.genericName}</p>}
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">{p.prescriptionRequired && <RxBadge />}<span>{p.unit}{p.rating > 0 && <> · ⭐ {p.rating.toFixed(1)}</>}</span></p>
        <div className="my-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">{taka(p.price)}</span>
          {p.oldPrice ? <span className="text-xs text-gray-400 line-through">{taka(p.oldPrice)}</span> : null}
          {!out && p.stock <= 5 && <span className="text-[10px] font-medium text-amber-600">Only {p.stock} left</span>}
        </div>
        <div className="mt-auto space-y-1.5">
          <AddToCart product={p} />
          <div className="flex gap-1.5">
            <button onClick={buyNow} disabled={out} className="btn-outline btn-sm flex-1 !py-1.5 text-xs">Buy Now</button>
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I want to order: ${p.name} (${taka(p.price)})`)}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-sm flex items-center justify-center rounded-lg bg-[#25D366] px-2.5 text-white hover:opacity-90"
                aria-label="Order on WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
