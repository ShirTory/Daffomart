import Link from "next/link";
import Image from "next/image";
import { discountPct, taka } from "@/lib/format";
import type { Product } from "@/lib/types";
import AddToCart from "./AddToCart";
import { RxBadge } from "./MedicineBadge";

/** Photos we host (database/local uploads and Firebase Storage) go through the Next.js image optimizer, which serves a small WebP sized for the card
 *  instead of the full 1200 px upload. Any other address (never uploaded through the admin) falls back to a plain <img>. */
const optimizable = (src: string) => src.startsWith("/api/uploads/") || src.startsWith("https://firebasestorage.googleapis.com/");
const CARD_SIZES = "(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw";

/** The parent must be `relative` with a fixed shape (the card uses an aspect-square link). */
export function ProductImage({ p, className = "", emojiSize = "text-6xl", priority = false }: { p: Pick<Product, "image" | "emoji" | "name">; className?: string; emojiSize?: string; priority?: boolean }) {
  if (!p.image) return <span className={`${emojiSize} select-none`}>{p.emoji}</span>;
  if (optimizable(p.image)) return <Image src={p.image} alt={p.name} fill sizes={CARD_SIZES} priority={priority} className={`object-cover ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={p.image} alt={p.name} loading="lazy" decoding="async" className={`h-full w-full object-cover ${className}`} />;
}

export default function ProductCard({ p }: { p: Product }) {
  const off = discountPct(p.price, p.oldPrice); const out = p.stock <= 0;
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
      {off > 0 && <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">-{off}%</span>}
      <Link href={`/products/${p.slug}`} className="relative flex aspect-square items-center justify-center overflow-hidden bg-primary-soft">
        <ProductImage p={p} className="transition duration-300 group-hover:scale-105" />
        {out && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-bold text-gray-700">Out of stock</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/products/${p.slug}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-gray-900 hover:text-primary">{p.name}</Link>
        {p.genericName && <p className="line-clamp-1 text-[11px] italic text-gray-400">{p.genericName}</p>}
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">{p.prescriptionRequired && <RxBadge />}<span>{p.unit}{p.rating > 0 && <> · ⭐ {p.rating.toFixed(1)}</>}</span></p>
        <div className="my-2 flex items-baseline gap-2"><span className="text-lg font-bold text-primary">{taka(p.price)}</span>{p.oldPrice ? <span className="text-xs text-gray-400 line-through">{taka(p.oldPrice)}</span> : null}</div>
        <div className="mt-auto"><AddToCart product={p} /></div>
      </div>
    </div>
  );
}
