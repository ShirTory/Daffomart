"use client";
import Link from "next/link";
import Logo from "./Logo";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart, useWishlist } from "@/lib/store";
import type { Category, DeliveryZone, Offer, StoreSettings } from "@/lib/types";
import { taka } from "@/lib/format";

const ZONE_KEY = "daffomart-zone";

export default function Header({
  settings, categories, zones = [], offers = [],
}: {
  settings: StoreSettings;
  categories: Category[];
  zones?: DeliveryZone[];
  offers?: Offer[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showZone, setShowZone] = useState(false);
  const [zoneId, setZoneId] = useState<string>("");
  const notifRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const wishCount = useWishlist((s) => s.items.length);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(ZONE_KEY);
      if (saved) setZoneId(saved);
      else if (zones[0]) setZoneId(zones[0].id);
    } catch {}
  }, [zones]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) setShowZone(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pickZone = (id: string) => {
    setZoneId(id);
    try { localStorage.setItem(ZONE_KEY, id); } catch {}
    setShowZone(false);
  };

  const currentZone = zones.find((z) => z.id === zoneId) || zones[0];
  const liveOffers = offers.slice(0, 5);
  const hasNotif = !!(settings.announcement || liveOffers.length);

  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm">
      {settings.announcement && (
        <div className="bg-primary-deeper px-3 py-1.5 text-center text-[11px] font-medium text-white/90 sm:px-4 sm:text-xs">
          {settings.announcement}
        </div>
      )}

      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
        <Link href="/" aria-label={`${settings.storeName} home`} className="shrink-0">
          <Logo src={settings.logo} name={settings.storeName} priority className="h-8 w-auto sm:h-10" />
        </Link>

        {/* Delivery address selector */}
        {zones.length > 0 && (
          <div className="relative hidden sm:block" ref={zoneRef}>
            <button
              onClick={() => setShowZone((v) => !v)}
              className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-left text-xs font-medium text-primary-dark transition hover:border-primary/40 md:max-w-[200px]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-6-5.7-6-10a6 6 0 1 1 12 0c0 4.3-6 10-6 10z" />
                <circle cx="12" cy="11" r="2" />
              </svg>
              <span className="truncate">{currentZone?.name || "Select area"}</span>
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showZone && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border bg-white shadow-pop">
                <p className="border-b bg-gray-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Delivery area</p>
                <ul className="max-h-64 overflow-y-auto py-1">
                  {zones.map((z) => (
                    <li key={z.id}>
                      <button
                        onClick={() => pickZone(z.id)}
                        className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-primary-soft ${z.id === currentZone?.id ? "bg-primary-soft font-semibold text-primary" : "text-gray-700"}`}
                      >
                        <span>{z.name}</span>
                        <span className="text-xs text-gray-400">{z.charge === 0 ? "Free" : taka(z.charge)} · {z.eta}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <form
          className="relative hidden flex-1 md:block"
          role="search"
          onSubmit={(e) => { e.preventDefault(); router.push(`/products?q=${encodeURIComponent(q)}`); }}
        >
          <input
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            placeholder="Search groceries, medicine, vegetables…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <svg viewBox="0 0 24 24" className="absolute left-4 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 21l-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" />
          </svg>
        </form>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          {settings.showMedicine && (
            <Link href="/medicine" className="hidden items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 lg:flex">
              💊 Medicine
            </Link>
          )}
          <Link href="/track" className="hidden rounded-lg px-2.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 md:block">
            Track
          </Link>

          {/* Wishlist */}
          <Link href="/wishlist" className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Wishlist">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {mounted && wishCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{wishCount}</span>
            )}
          </Link>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button onClick={() => setShowNotif((v) => !v)} className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Notifications">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {hasNotif && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-white shadow-pop">
                <p className="border-b bg-gray-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">Notifications & Offers</p>
                <div className="max-h-80 overflow-y-auto">
                  {settings.announcement && (
                    <div className="border-b px-3 py-2.5">
                      <p className="text-xs font-semibold text-primary">📢 Announcement</p>
                      <p className="mt-0.5 text-sm text-gray-700">{settings.announcement}</p>
                    </div>
                  )}
                  {liveOffers.length > 0 ? (
                    liveOffers.map((o) => (
                      <Link
                        key={o.id}
                        href={o.code ? `/products?sale=1` : "/products?sale=1"}
                        onClick={() => setShowNotif(false)}
                        className="flex gap-3 border-b px-3 py-2.5 transition hover:bg-primary-soft last:border-0"
                      >
                        {o.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-lg">🎁</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">{o.title}</p>
                          {o.badge && <span className="mt-0.5 inline-block rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">{o.badge}</span>}
                          {o.code && <p className="mt-0.5 text-xs text-primary">Code: {o.code}</p>}
                          {o.endsAt && (
                            <p className="mt-0.5 text-[11px] text-gray-400">
                              Until {new Date(o.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    !settings.announcement && <p className="px-3 py-6 text-center text-sm text-gray-400">No new offers right now</p>
                  )}
                </div>
                <Link
                  href="/products?sale=1"
                  onClick={() => setShowNotif(false)}
                  className="block border-t bg-gray-50 py-2.5 text-center text-xs font-semibold text-primary hover:bg-primary-soft"
                >
                  View all offers →
                </Link>
              </div>
            )}
          </div>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark sm:gap-2 sm:px-4"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 7H6M10 21h.01M18 21h.01" />
            </svg>
            <span className="hidden sm:inline">Cart</span>
            {mounted && count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold">{count}</span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile search + zone */}
      <div className="flex items-center gap-2 px-3 pb-2 sm:hidden">
        <form className="relative flex-1" role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/products?q=${encodeURIComponent(q)}`); }}>
          <input
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <svg viewBox="0 0 24 24" className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 21l-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" />
          </svg>
        </form>
        {zones.length > 0 && (
          <div className="relative" ref={zoneRef}>
            <button
              onClick={() => setShowZone((v) => !v)}
              className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-2 text-xs font-medium text-primary-dark"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s-6-5.7-6-10a6 6 0 1 1 12 0c0 4.3-6 10-6 10z" />
                <circle cx="12" cy="11" r="2" />
              </svg>
              <span className="max-w-[72px] truncate">{currentZone?.name || "Area"}</span>
            </button>
            {showZone && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border bg-white shadow-pop">
                <p className="border-b bg-gray-50 px-3 py-2 text-[11px] font-bold uppercase text-gray-400">Delivery area</p>
                <ul className="max-h-56 overflow-y-auto py-1">
                  {zones.map((z) => (
                    <li key={z.id}>
                      <button
                        onClick={() => pickZone(z.id)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${z.id === currentZone?.id ? "bg-primary-soft font-semibold text-primary" : ""}`}
                      >
                        <span>{z.name}</span>
                        <span className="text-[10px] text-gray-400">{z.charge === 0 ? "Free" : taka(z.charge)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category strip */}
      <nav className="border-t bg-white" aria-label="Categories">
        <div className="scroll-thin mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-1.5 text-sm font-medium sm:px-4">
          <Link href="/products" className="shrink-0 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-primary-soft hover:text-primary">
            All
          </Link>
          {settings.showMedicine && (
            <Link href="/medicine" className="shrink-0 rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">
              💊 Medicine
            </Link>
          )}
          {categories
            .filter((c) => c.kind !== "medicine")
            .map((c) => (
              <Link key={c.id} href={`/products?cat=${c.id}`} className="shrink-0 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-primary-soft hover:text-primary">
                {c.name}
              </Link>
            ))}
          <Link href="/products?sale=1" className="shrink-0 rounded-lg px-3 py-1.5 font-semibold text-accent-dark hover:bg-accent-soft">
            🔥 Offers
          </Link>
        </div>
      </nav>
    </header>
  );
}
