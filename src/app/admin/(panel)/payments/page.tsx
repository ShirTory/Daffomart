"use client";
import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { ErrorBox, Field, PageHeader, PageLoader, Spinner, StatusBadge, Toggle, useList, useToast } from "@/components/admin/ui";
import type { StoreSettings } from "@/lib/types";

const Row = ({ title, desc, on, onChange, children }: { title: string; desc: string; on: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) => (
  <section className="card p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{title}</h2><p className="text-sm text-gray-500">{desc}</p></div><Toggle checked={on} onChange={onChange} /></div>{on && children && <div className="mt-4 grid gap-4 border-t pt-4">{children}</div>}</section>
);

type F = Pick<StoreSettings, "payCod" | "payBkash" | "bkashNumber" | "payNagad" | "nagadNumber" | "payOnline" | "payInstructions">;
export default function PaymentsPage() {
  const toast = useToast(); const { data, loading, error, reload } = useList<StoreSettings>("/api/settings");
  const sys = useList<{ gateway: { connected: boolean; name: string; test: boolean } }>("/api/admin/system"); const gw = sys.data?.gateway;
  const [f, setF] = useState<F | null>(null); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setF({ payCod: data.payCod, payBkash: data.payBkash, bkashNumber: data.bkashNumber, payNagad: data.payNagad, nagadNumber: data.nagadNumber, payOnline: data.payOnline, payInstructions: data.payInstructions }); }, [data]);
  if (loading) return <PageLoader />; if (error || !f) return <ErrorBox msg={error || "Failed to load"} retry={reload} />;
  const set = <K extends keyof F>(k: K, v: F[K]) => setF({ ...f, [k]: v });
  const save = async () => {
    if (!f.payCod && !f.payBkash && !f.payNagad && !f.payOnline) return toast("Keep at least one payment method enabled", "err");
    setBusy(true); setErrs({});
    try { await api("/api/settings", { method: "PUT", body: f }); toast("Payment settings saved"); } catch (x: any) { if (x instanceof ApiClientError) setErrs(x.fields); toast(x.message, "err"); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="Payments" subtitle="Choose how customers can pay at checkout"><button className="btn-primary" onClick={save} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Save changes</button></PageHeader>
      <div className="grid gap-5 lg:grid-cols-2">
        <Row title="💵 Cash on delivery" desc="Customer pays the rider in cash. Marked “paid” automatically when delivered." on={f.payCod} onChange={(v) => set("payCod", v)} />
        <Row title="bKash (manual)" desc="Customer sends money to your number and enters the TrxID. You verify it on the order." on={f.payBkash} onChange={(v) => set("payBkash", v)}>
          <Field label="Your bKash number" error={errs.bkashNumber} hint="Required — shown to customers at checkout"><input className="input" value={f.bkashNumber} onChange={(e) => set("bkashNumber", e.target.value)} placeholder="01XXXXXXXXX" /></Field></Row>
        <Row title="Nagad (manual)" desc="Same as bKash, with your Nagad number." on={f.payNagad} onChange={(v) => set("payNagad", v)}>
          <Field label="Your Nagad number" error={errs.nagadNumber} hint="Required — shown to customers at checkout"><input className="input" value={f.nagadNumber} onChange={(e) => set("nagadNumber", e.target.value)} placeholder="01XXXXXXXXX" /></Field></Row>
        <Row title="💳 Online payment gateway" desc="Card / mobile banking through a payment gateway (SSLCommerz, AamarPay, bKash PGW…)." on={f.payOnline} onChange={(v) => set("payOnline", v)}>
          {gw?.connected && !gw.test ? <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><StatusBadge status="active" label={`Connected: ${gw.name}`} /><p className="mt-2">Customers can pay by card / mobile banking at checkout.</p></div>
            : gw?.test ? <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><StatusBadge status="low" label="TEST MODE (sandbox)" /><p className="mt-2">Checkout shows a fake payment page — <b>no real money moves</b> and anyone can “pay” for free. Remove <code>PAYMENT_TEST_MODE</code> from the environment before going live.</p></div>
            : <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><StatusBadge status="low" label="No gateway connected yet" /><p className="mt-2">Customers already see <b>Online payment</b> at checkout as “coming soon” (not selectable). When you pick a provider, the developer adds one adapter file — see <code>PAYMENTS.md</code> — and it turns on automatically. To try the full flow now, set <code>PAYMENT_TEST_MODE=true</code>.</p></div>}
          </Row>
        <section className="card p-5 lg:col-span-2"><h2 className="font-bold">Instructions shown for manual payments</h2>
          <textarea className="input mt-3" rows={3} value={f.payInstructions} onChange={(e) => set("payInstructions", e.target.value)} />
          <p className="mt-2 text-xs text-gray-500">Verify manual payments in <b>Orders → open an order → Payment</b> and press “Mark as paid”.</p></section>
      </div>
    </>
  );
}
