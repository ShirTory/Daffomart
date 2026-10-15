"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart, useWishlist } from "@/lib/store";
import { useEffect, useState } from "react";

const items = [
  { href: "/", label: "Home", icon: (a: boolean) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg> },
  { href: "/wishlist", label: "Wishlist", icon: (a: boolean) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { href: "/cart", label: "Cart", icon: (a: boolean) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6M10 21h.01M18 21h.01"/></svg> },
  { href: "/track", label: "Orders", icon: (a: boolean) => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4"/></svg> },
];

export default function BottomNav() {
  const path = usePathname();
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const wishCount = useWishlist((s) => s.items.length);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur safe-bottom md:hidden" aria-label="Mobile navigation">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((it) => {
          const active = path === it.href || (it.href !== "/" && path.startsWith(it.href));
          const badge = it.href === "/cart" ? cartCount : it.href === "/wishlist" ? wishCount : 0;
          return (
            <Link key={it.href} href={it.href} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-primary" : "text-gray-500"}`}>
              {it.icon(active)}
              <span>{it.label}</span>
              {mounted && badge > 0 && (
                <span className="absolute right-1/4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">{badge}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
