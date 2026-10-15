import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/store/ProductCard";
import HeroSlider from "@/components/store/HeroSlider";
import CopyCode from "@/components/store/CopyCode";
import { getActiveProducts, getBanners, getCategories, getOffers, getSettings } from "@/server/queries";
import { taka } from "@/lib/format";
export const revalidate = 60; // served from cache, refreshed when the admin saves (and at most every 60 s)

const Section = ({ title, children, href, sub }: { title: string; children: React.ReactNode; href?: string; sub?: string }) => (
  <section className="mt-10">
    <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>{sub && <p className="text-sm text-gray-500">{sub}</p>}</div>
      {href && <Link href={href} className="text-sm font-semibold text-primary hover:underline">View all →</Link>}</div>
    {children}
  </section>
);
const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">{children}</div>;

export default async function Home() {
  const [products, categories, banners, offers, settings] = await Promise.all([getActiveProducts(), getCategories(), getBanners(), getOffers(), getSettings()]);
  const medCats = categories.filter((c) => c.kind === "medicine"); const medIds = new Set(medCats.map((c) => c.id));
  const meds = products.filter((p) => medIds.has(p.categoryId));
  const shopCats = categories.filter((c) => c.kind !== "medicine");
  const groc = products.filter((p) => !medIds.has(p.categoryId));
  const featured = groc.filter((p) => p.featured).slice(0, 10);
  const fresh = [...groc].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  const sale = products.filter((p) => p.oldPrice && p.oldPrice > p.price).slice(0, 10);
  const best = [...groc].sort((a, b) => b.sold - a.sold).slice(0, 10);

  return (
    <>
      {banners.length > 0 ? <HeroSlider banners={banners} /> : (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-deeper via-primary-dark to-primary p-8 text-white sm:p-14">
          <div className="relative z-10 max-w-xl"><p className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-accent">{settings.storeName}</p>
            <h1 className="mt-4 whitespace-pre-line text-3xl font-extrabold leading-tight sm:text-5xl">{settings.heroTitle}</h1>
            <p className="mt-3 text-white/75">{settings.heroSubtitle || settings.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-3"><Link href="/products" className="btn-accent px-7 py-3">{settings.heroCta || "Shop now"}</Link>{settings.showMedicine && <Link href="/medicine" className="btn bg-emerald-500 px-7 py-3 text-white hover:bg-emerald-600">💊 Order medicine</Link>}</div></div>
          <Image src="/icon-mark.png" alt="" width={512} height={512} aria-hidden className="pointer-events-none absolute -right-6 top-1/2 hidden h-[130%] w-auto -translate-y-1/2 opacity-15 sm:block" />
        </section>)}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {settings.features.map((f, k) => (
          <div key={k} className="flex items-center gap-3 rounded-xl border bg-white p-3.5 shadow-card"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl">{f.icon}</span><div><p className="text-sm font-semibold">{f.title}</p><p className="text-xs text-gray-500">{f.text}</p></div></div>))}
      </div>

      {settings.showMedicine && (
        <section className="mt-8 overflow-hidden rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-5 shadow-card sm:p-7" aria-label="Medicine">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow">💊</span>
              <div><h2 className="text-xl font-extrabold tracking-tight text-emerald-900 sm:text-2xl">{settings.medicineTitle}</h2>{settings.medicineSubtitle && <p className="text-sm text-emerald-800/70">{settings.medicineSubtitle}</p>}</div></div>
            <Link href="/medicine" className="btn bg-emerald-600 text-white hover:bg-emerald-700">View all medicine →</Link>
          </div>
          {medCats.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{medCats.map((c) => <Link key={c.id} href={`/medicine?cat=${c.id}`} className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-600 hover:text-white">{c.emoji} {c.name}</Link>)}</div>}
          {settings.medicineNotice && <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-emerald-900 ring-1 ring-emerald-100">ℹ️ {settings.medicineNotice}</p>}
          {meds.length > 0 ? <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-5">{meds.slice(0, 5).map((p) => <ProductCard key={p.id} p={p} />)}</div> : <p className="mt-5 text-sm text-emerald-800/70">Medicine products will appear here soon.</p>}
        </section>)}

      {offers.length > 0 && (
        <Section title="Offers & Deals" sub="Limited-time promotions">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((o) => (
              <div key={o.id} className="group relative flex overflow-hidden rounded-2xl border bg-white shadow-card">
                <div className="relative w-2/5 shrink-0 bg-gradient-to-br from-accent to-accent-dark">
                  {o.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={o.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full min-h-[150px] items-center justify-center px-2 text-center text-2xl font-extrabold text-white">{o.discountType === "percent" ? `${o.discountValue}%` : taka(o.discountValue)}<br />OFF</div>}
                  {o.badge && <span className="absolute left-2 top-2 rounded bg-primary px-2 py-0.5 text-[11px] font-bold text-white">{o.badge}</span>}</div>
                <div className="flex flex-1 flex-col justify-center gap-2 p-4"><h3 className="font-bold leading-snug">{o.title}</h3>{o.description && <p className="line-clamp-2 text-sm text-gray-500">{o.description}</p>}
                  {o.code && <div className="flex flex-wrap items-center gap-2"><CopyCode code={o.code} />{o.minOrder > 0 && <span className="text-xs text-gray-500">Min. order {taka(o.minOrder)}</span>}</div>}
                  {o.endsAt && <p className="text-xs text-gray-400">Valid until {new Date(o.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}</div>
              </div>))}
          </div>
        </Section>)}

      {shopCats.length > 0 && (
        <Section title="Shop by category">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {shopCats.map((c) => (
              <Link key={c.id} href={`/products?cat=${c.id}`} className="group flex flex-col items-center rounded-2xl border bg-white p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-pop">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-3xl">{c.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : c.emoji}</div>
                <p className="mt-2 text-sm font-semibold group-hover:text-primary">{c.name}</p></Link>))}
          </div>
        </Section>)}

      {featured.length > 0 && <Section title="Featured products" href="/products?featured=1"><Grid>{featured.map((p) => <ProductCard key={p.id} p={p} />)}</Grid></Section>}
      {sale.length > 0 && <Section title="🔥 Hot deals" href="/products?sale=1" sub="Discounted prices — while stocks last"><Grid>{sale.map((p) => <ProductCard key={p.id} p={p} />)}</Grid></Section>}
      {best.some((p) => p.sold > 0) && <Section title="Best sellers" href="/products?sort=popular"><Grid>{best.map((p) => <ProductCard key={p.id} p={p} />)}</Grid></Section>}
      <Section title="New arrivals" href="/products"><Grid>{fresh.map((p) => <ProductCard key={p.id} p={p} />)}</Grid></Section>
      {products.length === 0 && <p className="mt-10 rounded-2xl border bg-white p-10 text-center text-gray-500">Products are coming soon. Please check back shortly!</p>}
    </>
  );
}
