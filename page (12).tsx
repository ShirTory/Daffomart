"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { Empty, ErrorBox, Field, ImageUpload, Icon, Modal, PageHeader, PageLoader, Spinner, StatusBadge, Toggle, useConfirm, useList, useToast } from "@/components/admin/ui";
import type { Banner } from "@/lib/types";

type Form = {
  title: string; subtitle: string; description: string; discountText: string;
  image?: string; mobileImage?: string; ctaLabel: string; ctaHref: string;
  active: boolean; sortOrder: string; startsAt: string; endsAt: string;
};
const emptyForm = (n: number): Form => ({
  title: "", subtitle: "", description: "", discountText: "",
  ctaLabel: "Shop now", ctaHref: "/products", active: true, sortOrder: String(n),
  startsAt: "", endsAt: "",
});
const toForm = (b: Banner): Form => ({
  title: b.title, subtitle: b.subtitle, description: b.description || "", discountText: b.discountText || "",
  image: b.image, mobileImage: b.mobileImage, ctaLabel: b.ctaLabel, ctaHref: b.ctaHref,
  active: b.active, sortOrder: String(b.sortOrder),
  startsAt: b.startsAt ? b.startsAt.slice(0, 10) : "", endsAt: b.endsAt ? b.endsAt.slice(0, 10) : "",
});

export default function CoversPage() {
  const toast = useToast(); const { confirm, node } = useConfirm();
  const { data, setData, loading, error, reload } = useList<Banner[]>("/api/banners");
  const [edit, setEdit] = useState<{ id?: string; f: Form } | null>(null);
  const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<Record<string, string>>({});
  const open = (b?: Banner) => { setErrs({}); setEdit(b ? { id: b.id, f: toForm(b) } : { f: emptyForm((data?.length ?? 0) + 1) }); };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setEdit((e) => (e ? { ...e, f: { ...e.f, [k]: v } } : e));
  const save = async () => {
    if (!edit) return; setBusy(true); setErrs({});
    try {
      const body = {
        ...edit.f,
        image: edit.f.image ?? "",
        startsAt: edit.f.startsAt || undefined,
        endsAt: edit.f.endsAt || undefined,
        description: edit.f.description || undefined,
        discountText: edit.f.discountText || undefined,
      };
      const s = await api<Banner>(edit.id ? `/api/banners/${edit.id}` : "/api/banners", { method: edit.id ? "PUT" : "POST", body });
      setData((d) => (edit.id ? d!.map((x) => (x.id === s.id ? s : x)) : [...(d ?? []), s]).sort((a, b) => a.sortOrder - b.sortOrder));
      toast("Offer poster saved"); setEdit(null);
    } catch (e: any) { if (e instanceof ApiClientError) setErrs(e.fields); toast(e.message, "err"); } finally { setBusy(false); }
  };
  const del = async (b: Banner) => { if (!(await confirm("Delete this offer poster?"))) return; try { await api(`/api/banners/${b.id}`, { method: "DELETE" }); setData((d) => d!.filter((x) => x.id !== b.id)); toast("Deleted"); } catch (e: any) { toast(e.message, "err"); } };
  const flip = async (b: Banner) => { try { const s = await api<Banner>(`/api/banners/${b.id}`, { method: "PUT", body: { ...b, active: !b.active } }); setData((d) => d!.map((x) => (x.id === s.id ? s : x))); } catch (e: any) { toast(e.message, "err"); } };

  const dateLabel = (b: Banner) => {
    if (!b.startsAt && !b.endsAt) return null;
    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "…";
    return `${fmt(b.startsAt)} – ${fmt(b.endsAt)}`;
  };

  return (
    <>
      <PageHeader title="Offer posters" subtitle="Homepage carousel banners — upload, schedule, activate & reorder" action={<button className="btn-primary" onClick={() => open()}><Icon name="plus" className="h-4 w-4" />Add poster</button>} />
      {loading && <PageLoader />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!loading && !error && (data?.length ?? 0) === 0 && <Empty title="No offer posters yet" text="Add a wide promotional image for the homepage carousel." action={<button className="btn-primary" onClick={() => open()}>Add first poster</button>} />}
      {!loading && data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-2xl border bg-white shadow-card">
              <div className="relative aspect-[16/7] bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={b.title || "Poster"} className="h-full w-full object-cover" />
                {b.discountText && <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-white">{b.discountText}</span>}
              </div>
              <div className="space-y-2 p-3">
                <p className="font-semibold line-clamp-1">{b.title || "Untitled poster"}</p>
                {b.subtitle && <p className="text-xs text-gray-500 line-clamp-1">{b.subtitle}</p>}
                {dateLabel(b) && <p className="text-[11px] text-gray-400">📅 {dateLabel(b)}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Toggle checked={b.active} onChange={() => flip(b)} />
                  <StatusBadge status={b.active ? "active" : "inactive"} label={b.active ? "Showing" : "Hidden"} />
                  <span className="text-xs text-gray-400">Order #{b.sortOrder}</span>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost btn-sm" onClick={() => open(b)}><Icon name="edit" className="h-4 w-4" />Edit</button>
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => del(b)}><Icon name="trash" className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => !busy && setEdit(null)} title={edit?.id ? "Edit offer poster" : "Add offer poster"} wide
        footer={<><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Save</button></>}>
        {edit && <div className="space-y-4">
          <ImageUpload kind="banner" label="Cover image (desktop)" aspect="aspect-[16/5]" value={edit.f.image} onChange={(v) => set("image", v)} hint="Wide image, 1920 × 600 px recommended" />
          {errs.image && <p className="text-xs text-red-600">{errs.image}</p>}
          <div className="max-w-xs"><ImageUpload kind="banner" label="Mobile image (optional)" aspect="aspect-[4/3]" value={edit.f.mobileImage} onChange={(v) => set("mobileImage", v)} hint="e.g. 1000 × 750 px" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Headline (optional)"><input className="input" value={edit.f.title} onChange={(e) => set("title", e.target.value)} placeholder="Fresh groceries, delivered fast" /></Field>
            <Field label="Sub-headline (optional)"><input className="input" value={edit.f.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></Field>
            <Field label="Description (optional)" className="sm:col-span-2"><textarea className="input min-h-[60px]" value={edit.f.description} onChange={(e) => set("description", e.target.value)} placeholder="Short promo text shown on the poster" /></Field>
            <Field label="Discount badge text"><input className="input" value={edit.f.discountText} onChange={(e) => set("discountText", e.target.value)} placeholder="e.g. 20% OFF or ৳50 OFF" /></Field>
            <Field label="Button text"><input className="input" value={edit.f.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Shop now" /></Field>
            <Field label="Button link" hint="e.g. /products or /products?sale=1"><input className="input" value={edit.f.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} /></Field>
            <Field label="Sort order"><input className="input" type="number" value={edit.f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field>
            <Field label="Start date (optional)"><input className="input" type="date" value={edit.f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field>
            <Field label="End date (optional)"><input className="input" type="date" value={edit.f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field>
          </div>
          <Toggle checked={edit.f.active} onChange={(v) => set("active", v)} label="Show on home page (only within date range if set)" />
        </div>}
      </Modal>
      {node}
    </>
  );
}
