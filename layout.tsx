import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";
import { getCategories, getSettings } from "@/server/queries";
export const revalidate = 60; // served from cache, refreshed when the admin saves (and at most every 60 s)

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const wa = settings.whatsapp.replace(/\D/g, "");
  return (
    <>
      <Header settings={settings} categories={categories} />
      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-6">{children}</main>
      <Footer settings={settings} categories={categories} />
      {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp" className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-pop transition hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z" /></svg></a>}
    </>
  );
}
