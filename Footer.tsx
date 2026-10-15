import Link from "next/link";
import Logo from "./Logo";
import type { Category, StoreSettings } from "@/lib/types";

export default function Footer({ settings: s, categories }: { settings: StoreSettings; categories: Category[] }) {
  return (
    <footer className="mt-12 bg-primary-deeper text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="inline-block rounded-xl bg-white px-3 py-2"><Logo src={s.logo} name={s.storeName} className="h-9 w-auto" /></div>
          <p className="mt-4 max-w-xs text-sm text-white/70">{s.footerText || s.tagline}</p>
        </div>
        <div className="text-sm"><h4 className="mb-3 font-semibold">Shop</h4>
          <ul className="space-y-2 text-white/70"><li><Link className="hover:text-white" href="/products">All products</Link></li>{s.showMedicine && <li><Link className="font-semibold text-emerald-300 hover:text-white" href="/medicine">💊 Medicine</Link></li>}{categories.filter((c) => c.kind !== "medicine").slice(0, 5).map((c) => <li key={c.id}><Link className="hover:text-white" href={`/products?cat=${c.id}`}>{c.name}</Link></li>)}</ul></div>
        <div className="text-sm"><h4 className="mb-3 font-semibold">Help</h4>
          <ul className="space-y-2 text-white/70"><li><Link className="hover:text-white" href="/track">Track your order</Link></li><li><Link className="hover:text-white" href="/contact">Contact &amp; delivery info</Link></li><li><Link className="hover:text-white" href="/cart">My cart</Link></li><li><Link className="hover:text-white" href="/checkout">Checkout</Link></li></ul></div>
        <div className="text-sm"><h4 className="mb-3 font-semibold">Contact</h4>
          <ul className="space-y-2 text-white/70">{s.address && <li>{s.address}</li>}{s.hours && <li>🕒 {s.hours}</li>}{s.phone && <li><a className="hover:text-white" href={`tel:${s.phone}`}>{s.phone}</a></li>}{s.email && <li><a className="hover:text-white" href={`mailto:${s.email}`}>{s.email}</a></li>}{s.facebook && <li><a className="hover:text-white" href={s.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></li>}</ul>
          <p className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">💵 Cash on delivery</p></div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">© {new Date().getFullYear()} {s.storeName}. All rights reserved.</div>
    </footer>
  );
}
