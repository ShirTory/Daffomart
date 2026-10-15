"use client";
import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { ErrorBox, Field, Icon, PageHeader, PageLoader, Spinner, StatusBadge, useList, useToast } from "@/components/admin/ui";
import type { StoreSettings } from "@/lib/types";

const KEYS = ["storeName", "tagline", "announcement", "address", "phone", "whatsapp", "email", "facebook", "hours", "mapUrl", "minOrder"] as const;
type K = (typeof KEYS)[number];
interface Sys { storage: string; persistent: boolean; devCredentials: boolean; firebase: { configured: boolean; projectId: string; bucket: string }; test?: { firestore: string; storage: string } }

export default function SettingsPage() {
  const toast = useToast(); const { data, loading, error, reload } = useList<StoreSettings>("/api/settings"); const sys = useList<Sys>("/api/admin/system");
  const [f, setF] = useState<Record<K, string> | null>(null); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<Record<string, string>>({});
  const [test, setTest] = useState<Sys["test"] | null>(null); const [testing, setTesting] = useState(false);
  useEffect(() => { if (data) setF(Object.fromEntries(KEYS.map((k) => [k, String(data[k] ?? "")])) as Record<K, string>); }, [data]);
  if (loading) return <PageLoader />; if (error || !f) return <ErrorBox msg={error || "Failed to load"} retry={reload} />;
  const set = (k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErrs({});
    try { await api("/api/settings", { method: "PUT", body: f }); toast("Settings saved"); } catch (x: any) { if (x instanceof ApiClientError) setErrs(x.fields); toast(x.message, "err"); } finally { setBusy(false); }
  };
  const runTest = async () => { setTesting(true); try { setTest((await api<Sys>("/api/admin/system?test=1")).test ?? null); } catch (e: any) { toast(e.message, "err"); } finally { setTesting(false); } };
  const fb = sys.data?.firebase;
  return (
    <>
      <form onSubmit={save}>
        <PageHeader title="Settings & contact" subtitle="Store details, contact information and order rules"><button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Save changes</button></PageHeader>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card space-y-4 p-5"><h2 className="font-bold">Store information</h2>
            <Field label="Store name" error={errs.storeName}><input className="input" value={f.storeName} onChange={set("storeName")} /></Field>
            <Field label="Tagline"><input className="input" value={f.tagline} onChange={set("tagline")} /></Field>
            <Field label="Announcement bar" hint="Shown at the very top of the website. Leave empty to hide."><input className="input" value={f.announcement} onChange={set("announcement")} /></Field>
            <Field label="Minimum order amount (৳)" hint="0 = no minimum" error={errs.minOrder}><input className="input" type="number" min="0" value={f.minOrder} onChange={set("minOrder")} /></Field>
          </section>
          <section className="card space-y-4 p-5"><h2 className="font-bold">Contact information</h2>
            <p className="-mt-2 text-xs text-gray-500">Shown in the website header/footer and on the Contact page.</p>
            <Field label="Address"><input className="input" value={f.address} onChange={set("address")} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone"><input className="input" value={f.phone} onChange={set("phone")} placeholder="01XXXXXXXXX" /></Field><Field label="WhatsApp number" hint="With country code, e.g. 8801XXXXXXXXX"><input className="input" value={f.whatsapp} onChange={set("whatsapp")} /></Field></div>
            <Field label="Email"><input className="input" value={f.email} onChange={set("email")} /></Field>
            <Field label="Opening hours"><input className="input" value={f.hours} onChange={set("hours")} placeholder="Every day, 8 AM – 10 PM" /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Facebook page URL"><input className="input" value={f.facebook} onChange={set("facebook")} placeholder="https://facebook.com/…" /></Field><Field label="Google Maps link"><input className="input" value={f.mapUrl} onChange={set("mapUrl")} placeholder="https://maps.google.com/…" /></Field></div>
          </section>
        </div>
      </form>

      <section className="card mt-6 space-y-3 p-5"><h2 className="font-bold">Delivery charges</h2><p className="text-sm text-gray-600">Delivery areas and charges are managed on the <a href="/admin/delivery" className="font-semibold text-primary underline">Delivery Areas</a> page.</p></section>

      <section className="card mt-6 space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Database &amp; storage (Firebase)</h2><p className="text-xs text-gray-500">Permanent storage for products, orders and uploaded images.</p></div>
          <button className="btn-outline" onClick={runTest} disabled={testing}>{testing ? <Spinner className="h-4 w-4" /> : <Icon name="check" className="h-4 w-4" />}Test connection</button></div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Mode</p><StatusBadge status={sys.data?.persistent ? "active" : "low"} label={sys.data?.persistent ? "Firebase (permanent)" : "Local / temporary"} /></div>
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Project</p><p className="font-medium">{fb?.projectId || "not set"}</p></div>
          <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Storage bucket</p><p className="truncate font-medium">{fb?.bucket || "not set"}</p></div>
        </div>
        {test && <div className="grid gap-3 text-sm sm:grid-cols-2">{([["Firestore database", test.firestore], ["Storage (images)", test.storage]] as const).map(([l, v]) => <div key={l} className={`rounded-lg p-3 ${v === "OK" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}><p className="text-xs font-semibold uppercase">{l}</p><p className="mt-0.5 break-words">{v === "OK" ? "✓ Working" : v}</p></div>)}</div>}
        {!fb?.configured && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Firebase is <b>not connected</b> yet — data is saved only on this server and can be lost. Follow <code>DEPLOYMENT.md</code> to add the Firebase variables.</p>}
      </section>
    </>
  );
}
