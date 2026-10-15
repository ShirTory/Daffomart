import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import BottomNav from "@/components/store/BottomNav";
import { getCategories, getSettings, getZones, getOffers } from "@/server/queries";
export const revalidate = 60;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, zones, offers] = await Promise.all([
    getSettings(), getCategories(), getZones(), getOffers(),
  ]);
  const wa = settings.whatsapp.replace(/\D/g, "");
  return (
    <>
      <Header settings={settings} categories={categories} zones={zones} offers={offers} />
      <main className="mx-auto min-h-[70vh] max-w-7xl px-3 py-4 sm:px-4 sm:py-6 pb-24 md:pb-6">{children}</main>
      <Footer settings={settings} categories={categories} />
      <BottomNav />
      {wa && (
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-pop transition hover:scale-105 sm:right-5 md:bottom-5"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z" />
          </svg>
        </a>
      )}
    </>
  );
}
