import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/store/ProductCard";
import { getActiveProducts, getCategories } from "@/server/queries";
export const metadata: Metadata = { title: "All Products" };
const PER = 24;

type SP = { q?: string; cat?: string; sort?: string; max?: string; sale?: string; featured?: string; page?: string };
export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams; const { q = "", cat = "", sort = "", max = "", sale = "", featured = "" } = sp; const page = Math.max(1, Number(sp.page) || 1);
  const [all, categories] = await Promise.all([getActiveProducts(), getCategories()]);
  let list = all.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) && (!cat || p.categoryId === cat) && (!max || p.price <= Number(max)) && (!sale || (p.oldPrice && p.oldPrice > p.price)) && (!featured || p.featured));
  if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
  else if (sort === "popular") list.sort((a, b) => b.sold - a.sold);
  else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const total = list.length, pages = Math.max(1, Math.ceil(total / PER)); list = list.slice((page - 1) * PER, page * PER);
  const link = (o: Record<string, string>) => { const p = new URLSearchParams(Object.entries({ q, cat, sort, max, sale, featured, ...o }).filter(([, v]) => v) as [string, string][]); const s = p.toString(); return `/products${s ? `?${s}` : ""}`; };
  const heading = sale ? "Offers & Discounts" : featured ? "Featured Products" : cat ? categories.find((c) => c.id === cat)?.name ?? "Products" : "All Products";
  const chip = (active: boolean) => `rounded-lg px-3 py-1.5 transition ${active ? "bg-primary text-white" : "bg-gray-50 text-gray-700 hover:bg-primary-soft"}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="h-fit space-y-6 rounded-2xl border bg-white p-5 text-sm shadow-card lg:sticky lg:top-40">
        <div><h3 className="mb-3 font-bold">Categories</h3><div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          <Link href={link({ cat: "", page: "" })} className={chip(!cat)}>All</Link>
          {categories.map((c) => <Link key={c.id} href={link({ cat: c.id, page: "" })} className={chip(cat === c.id)}>{c.emoji} {c.name}</Link>)}</div></div>
        <div><h3 className="mb-3 font-bold">Max price</h3><div className="flex flex-wrap gap-2">{["", "100", "300", "500", "1000"].map((m) => <Link key={m} href={link({ max: m, page: "" })} className={chip(max === m)}>{m ? `৳${m}` : "Any"}</Link>)}</div></div>
        <div><h3 className="mb-3 font-bold">Sort by</h3><div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">{[["", "Newest"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"], ["popular", "Most popular"]].map(([v, l]) => <Link key={v} href={link({ sort: v, page: "" })} className={chip(sort === v)}>{l}</Link>)}</div></div>
      </aside>
      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h1 className="text-2xl font-bold tracking-tight">{heading}{q && <span className="ml-2 text-base font-normal text-gray-500">for “{q}”</span>}</h1><p className="text-sm text-gray-500">{total} product{total === 1 ? "" : "s"}</p></div>
        {list.length === 0 ? <div className="rounded-2xl border bg-white p-12 text-center"><p className="text-4xl">🔍</p><p className="mt-2 font-semibold">No products found</p><p className="text-sm text-gray-500">Try a different search or filter.</p><Link href="/products" className="btn-primary mt-4">Clear filters</Link></div> :
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
        {pages > 1 && <nav className="mt-8 flex flex-wrap justify-center gap-2" aria-label="Pagination">{Array.from({ length: pages }, (_, i) => i + 1).map((n) => <Link key={n} href={link({ page: String(n) })} className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold ${n === page ? "border-primary bg-primary text-white" : "bg-white hover:bg-primary-soft"}`}>{n}</Link>)}</nav>}
      </section>
    </div>
  );
}
