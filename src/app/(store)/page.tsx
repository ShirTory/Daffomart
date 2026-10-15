import Link from "next/link";
import ProductCard from "@/components/store/ProductCard";
import HeroSlider from "@/components/store/HeroSlider";
import CopyCode from "@/components/store/CopyCode";
import { getActiveProducts, getBanners, getCategories, getOffers, getSettings } from "@/server/queries";
import { taka } from "@/lib/format";
export const revalidate = 60;

const Section = ({
  title, children, href, sub,
}: {
  title: string; children: React.ReactNode; href?: string; sub?: string;
}) => (
  <section className="mt-8 sm:mt-10">
    <div className="mb-3 flex items-end justify-between gap-2 sm:mb-4">
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-xs font-semibold text-primary hover:underline sm:text-sm">
          View all →
        </Link>
      )}
    </div>
    {children}
  </section>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
    {children}
  </div>
);

export default async function Home() {
  const [products, categories, banners, offers, settings] = await Promise.all([
    getActiveProducts(), getCategories(), getBanners(), getOffers(), getSettings(),
  ]);
  const medCats = categories.filter((c) => c.kind === "medicine");
  const medIds = new Set(medCats.map((c) => c.id));
  const shopCats = categories.filter((c) => c.kind !== "medicine");
  const groc = products.filter((p) => !medIds.has(p.categoryId));
  const featured = groc.filter((p) => p.featured).slice(0, 10);
  const fresh = [...groc].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  const sale = products.filter((p) => p.oldPrice && p.oldPrice > p.price).slice(0, 10);
  const best = [...groc].sort((a, b) => b.sold - a.sold).slice(0, 10);

  return (
    <>
      {/* Promotional carousel — only active + in-date banners from admin */}
      {banners.length > 0 && <HeroSlider banners={banners} />}

      {/* Trust strip */}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border bg-white p-3 shadow-card sm:mt-5 sm:grid-cols-4 sm:gap-3 sm:p-4">
        {[
          { icon: "🚚", t: "Fast delivery", s: "Same-day in many areas" },
          { icon: "💵", t: "Cash on delivery", s: "Pay when you receive" },
          { icon: "🌿", t: "Fresh & quality", s: "Checked before packing" },
          { icon: "↩️", t: "Easy support", s: "WhatsApp help anytime" },
        ].map((x) => (
          <div key={x.t} className="flex items-center gap-2.5 sm:flex-col sm:items-center sm:text-center md:flex-row md:text-left">
            <span className="text-xl sm:text-2xl">{x.icon}</span>
            <div>
              <p className="text-xs font-bold text-gray-900 sm:text-sm">{x.t}</p>
              <p className="text-[10px] text-gray-500 sm:text-xs">{x.s}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Special offers / coupons */}
      {offers.length > 0 && (
        <Section title="Special offers" sub="Use codes at checkout">
          <div className="scroll-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {offers.map((o) => (
              <div
                key={o.id}
                className="flex w-[260px] shrink-0 overflow-hidden rounded-2xl border bg-white shadow-card sm:w-[280px]"
              >
                <div className="flex w-16 shrink-0 items-center justify-center bg-gradient-to-b from-accent to-accent-dark text-white sm:w-20">
                  {o.badge ? (
                    <span className="rotate-[-90deg] whitespace-nowrap text-xs font-bold tracking-wide">{o.badge}</span>
                  ) : (
                    <span className="text-2xl">🎁</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center gap-1.5 p-3">
                  <h3 className="text-sm font-bold leading-snug">{o.title}</h3>
                  {o.description && <p className="line-clamp-2 text-xs text-gray-500">{o.description}</p>}
                  {o.code && (
                    <div className="flex flex-wrap items-center gap-2">
                      <CopyCode code={o.code} />
                      {o.minOrder > 0 && <span className="text-[10px] text-gray-500">Min {taka(o.minOrder)}</span>}
                    </div>
                  )}
                  {o.endsAt && (
                    <p className="text-[10px] text-gray-400">
                      Until {new Date(o.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Horizontal categories */}
      {shopCats.length > 0 && (
        <Section title="Shop by category">
          <div className="scroll-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible md:grid-cols-6 lg:grid-cols-8">
            {shopCats.map((c) => (
              <Link
                key={c.id}
                href={`/products?cat=${c.id}`}
                className="group flex w-[88px] shrink-0 flex-col items-center rounded-2xl border bg-white p-3 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-pop sm:w-auto"
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-2xl sm:h-16 sm:w-16 sm:text-3xl">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    c.emoji
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold group-hover:text-primary sm:text-sm">{c.name}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {featured.length > 0 && (
        <Section title="Featured products" href="/products?featured=1">
          <Grid>{featured.map((p) => <ProductCard key={p.id} p={p} whatsapp={settings.whatsapp} />)}</Grid>
        </Section>
      )}

      {sale.length > 0 && (
        <Section title="🔥 Hot deals" href="/products?sale=1" sub="Discounted prices — while stocks last">
          <Grid>{sale.map((p) => <ProductCard key={p.id} p={p} whatsapp={settings.whatsapp} />)}</Grid>
        </Section>
      )}

      {best.some((p) => p.sold > 0) && (
        <Section title="Best sellers" href="/products?sort=popular">
          <Grid>{best.map((p) => <ProductCard key={p.id} p={p} whatsapp={settings.whatsapp} />)}</Grid>
        </Section>
      )}

      <Section title="New arrivals" href="/products">
        <Grid>{fresh.map((p) => <ProductCard key={p.id} p={p} whatsapp={settings.whatsapp} />)}</Grid>
      </Section>

      {products.length === 0 && (
        <p className="mt-10 rounded-2xl border bg-white p-10 text-center text-gray-500">
          Products are coming soon. Please check back shortly!
        </p>
      )}

      {/* Policies strip */}
      <section className="mt-10 rounded-2xl border bg-white p-5 shadow-card sm:p-6">
        <h2 className="mb-3 text-base font-bold sm:text-lg">Delivery & return policy</h2>
        <ul className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
          <li>📦 Orders are packed carefully and delivered to your door.</li>
          <li>⏱ Most areas get same-day or next-day delivery.</li>
          <li>❌ You can cancel within 2 minutes of placing the order.</li>
          <li>🔄 Contact us on WhatsApp for any quality or missing-item issues.</li>
        </ul>
      </section>
    </>
  );
}
