"use client";
import Link from "next/link";
import Logo from "./Logo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/store";
import type { Category, StoreSettings } from "@/lib/types";

export default function Header({ settings, categories }: { settings: StoreSettings; categories: Category[] }) {
  const router = useRouter(); const [q, setQ] = useState(""); const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const wishCount = useCart((s) => s.wishlist.length);
  useEffect(() => setMounted(true), []);
  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      {settings.announcement && <div className="bg-primary-deeper px-4 py-1.5 text-center text-xs font-medium text-white/90">{settings.announcement}</div>}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-6">
        <Link href="/" aria-label={`${settings.storeName} home`} className="shrink-0"><Logo src={settings.logo} name={settings.storeName} priority className="h-9 w-auto sm:h-11" /></Link>
        <form className="relative hidden flex-1 sm:block" role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/products?q=${encodeURIComponent(q)}`); }}>
          <input className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20" placeholder="Search groceries, medicine, vegetables…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
          <svg viewBox="0 0 24 24" className="absolute left-4 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M21 21l-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" /></svg>
        </form>
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          {settings.showMedicine && <Link href="/medicine" className="hidden items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 md:flex">💊 Medicine</Link>}
          <Link href="/orders" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 md:block">My orders</Link>
          <Link href="/track" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 md:block">Track</Link>
          <Link href="/wishlist" className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Wishlist">
            <span className="text-lg" aria-hidden>♡</span>
            {mounted && wishCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{wishCount}</span>}
          </Link>
          <Link href="/contact" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 lg:block">Contact</Link>
          <Link href="/cart" className="relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6M10 21h.01M18 21h.01" /></svg>
            <span className="hidden sm:inline">Cart</span>
            {mounted && count > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold">{count}</span>}
          </Link>
        </div>
      </div>
      <form className="px-4 pb-2.5 sm:hidden" role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/products?q=${encodeURIComponent(q)}`); }}>
        <input className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-primary" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
      </form>
      <nav className="border-t bg-white" aria-label="Categories">
        <div className="scroll-thin mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 text-sm font-medium">
          <Link href="/products" className="shrink-0 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-primary-soft hover:text-primary">All products</Link>
          {settings.showMedicine && <Link href="/medicine" className="shrink-0 rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">💊 Medicine</Link>}
          {categories.filter((c) => c.kind !== "medicine").map((c) => <Link key={c.id} href={`/products?cat=${c.id}`} className="shrink-0 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-primary-soft hover:text-primary">{c.name}</Link>)}
          <Link href="/products?sale=1" className="shrink-0 rounded-lg px-3 py-1.5 font-semibold text-accent-dark hover:bg-accent-soft">🔥 Offers</Link>
          <Link href="/wishlist" className="shrink-0 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-primary-soft hover:text-primary md:hidden">Wishlist</Link>
          <Link href="/orders" className="shrink-0 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-primary-soft hover:text-primary md:hidden">My orders</Link>
        </div>
      </nav>
    </header>
  );
}
