"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { Empty, ErrorBox, Field, ImageUpload, Icon, Modal, PageHeader, PageLoader, Spinner, StatusBadge, Thumb, Toggle, useConfirm, useList, useToast } from "@/components/admin/ui";
import type { Category } from "@/lib/types";

type Form = { name: string; emoji: string; image?: string; kind: "grocery" | "medicine"; active: boolean; sortOrder: string };
export default function CategoriesPage() {
  const toast = useToast(); const { confirm, node } = useConfirm();
  const { data, setData, loading, error, reload } = useList<Category[]>("/api/categories");
  const [edit, setEdit] = useState<{ id?: string; f: Form } | null>(null); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<Record<string, string>>({});
  const open = (c?: Category) => { setErrs({}); setEdit(c ? { id: c.id, f: { name: c.name, emoji: c.emoji, image: c.image, kind: c.kind ?? "grocery", active: c.active, sortOrder: String(c.sortOrder) } } : { f: { name: "", emoji: "🛍️", kind: "grocery", active: true, sortOrder: String((data?.length ?? 0) + 1) } }); };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setEdit((e) => (e ? { ...e, f: { ...e.f, [k]: v } } : e));
  const save = async () => {
    if (!edit) return; setBusy(true); setErrs({});
    try {
      const s = await api<Category>(edit.id ? `/api/categories/${edit.id}` : "/api/categories", { method: edit.id ? "PUT" : "POST", body: edit.f });
      setData((d) => { const l = edit.id ? d!.map((x) => (x.id === s.id ? s : x)) : [...(d ?? []), s]; return l.sort((a, b) => a.sortOrder - b.sortOrder); });
      toast("Category saved"); setEdit(null);
    } catch (e: any) { if (e instanceof ApiClientError) setErrs(e.fields); toast(e.message, "err"); } finally { setBusy(false); }
  };
  const del = async (c: Category) => {
    if (!(await confirm(`Delete category "${c.name}"?`))) return;
    try { await api(`/api/categories/${c.id}`, { method: "DELETE" }); setData((d) => d!.filter((x) => x.id !== c.id)); toast("Category deleted"); } catch (e: any) { toast(e.message, "err"); }
  };
  return (
    <>
      <PageHeader title="Categories" subtitle="Organise your products into shop sections"><button className="btn-primary" onClick={() => open()}><Icon name="plus" className="h-4 w-4" />Add category</button></PageHeader>
      {loading ? <PageLoader /> : error ? <ErrorBox msg={error} retry={reload} /> : !data?.length ? <div className="card"><Empty icon="categories" title="No categories yet" action={<button className="btn-primary" onClick={() => open()}>Add category</button>} /></div> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <div key={c.id} className="card flex items-center gap-4 p-4">
              <Thumb src={c.image} emoji={c.emoji} className="h-16 w-16 text-3xl" />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.name}</p><p className="text-xs text-gray-500">Order #{c.sortOrder}</p><div className="mt-1"><StatusBadge status={c.active ? "active" : "inactive"} label={c.active ? "Visible" : "Hidden"} />{c.kind === "medicine" && <span className="badge ml-1 bg-emerald-100 text-emerald-800">💊 Medicine</span>}</div></div>
              <div className="flex flex-col gap-1"><button className="btn-ghost btn-sm" onClick={() => open(c)} aria-label="Edit"><Icon name="edit" className="h-4 w-4" /></button><button className="btn-ghost btn-sm text-red-600" onClick={() => del(c)} aria-label="Delete"><Icon name="trash" className="h-4 w-4" /></button></div>
            </div>))}
        </div>)}
      <Modal open={!!edit} onClose={() => !busy && setEdit(null)} title={edit?.id ? "Edit category" : "Add category"}
        footer={<><button className="btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Save</button></>}>
        {edit && <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]"><ImageUpload kind="category" label="Image" value={edit.f.image} onChange={(v) => set("image", v)} />
            <div className="space-y-4"><Field label="Name" error={errs.name}><input className="input" value={edit.f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Vegetables" /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Emoji" hint="Fallback icon"><input className="input" value={edit.f.emoji} maxLength={8} onChange={(e) => set("emoji", e.target.value)} /></Field><Field label="Sort order"><input className="input" type="number" value={edit.f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field></div></div></div>
          <Field label="Section type" hint="Medicine categories appear in the highlighted Medicine section of the website."><select className="input" value={edit.f.kind} onChange={(e) => set("kind", e.target.value as Form["kind"])}><option value="grocery">Grocery / general shop</option><option value="medicine">💊 Medicine / healthcare</option></select></Field>
          <Toggle checked={edit.f.active} onChange={(v) => set("active", v)} label="Visible in store" />
        </div>}
      </Modal>
      {node}
    </>
  );
}
