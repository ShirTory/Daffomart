import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DEFAULT_DESC, DEFAULT_OG, SITE_NAME, SITE_URL } from "@/lib/site";

// Pages build their own canonical/Open Graph/Twitter data with pageMeta() (src/lib/seo.ts); these are the site-wide defaults.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "DaffoMart – Online Grocery & Medicine Delivery in Dhaka", template: "%s | DaffoMart" },
  description: DEFAULT_DESC,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_BD", images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: "DaffoMart – online grocery and medicine delivery" }] },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG] },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } : {}),
};
export const viewport: Viewport = { themeColor: "#1E3A8A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="font-sans">{children}</body></html>);
}
