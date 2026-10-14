"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDateTime, statusLabel, taka } from "@/lib/format";
import { distanceKm, fmtDistance, mapsDirections, roughEtaMin } from "@/lib/maps";
import LiveMap, { type Pin } from "@/components/maps/LiveMap";
import type { OrderItem } from "@/lib/types";

interface Tracked { orderNo: string; status: string; createdAt: string; updatedAt: string; items: OrderItem[]; subtotal: number; delivery: number; discount: number; total: number; zoneName?: string; payment?: string; paymentStatus?: string; riderName?: string; riderPhone?: string; dest?: { lat: number; lng: number }; riderLoc?: { lat: number; lng: number; ageSec: number } }
const STEPS = ["pending", "confirmed", "processing", "on_the_way", "delivered"];

export default function TrackForm() {
  const [no, setNo] = useState(""); const [phone, setPhone] = useState(""); const [o, setO] = useState<Tracked | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const lookup = async (n: string, p: string, silent = false) => {
    if (!silent) { setBusy(true); setErr(""); setO(null); }
    try { setO(await api<Tracked>(`/api/orders/track?no=${encodeURIComponent(n)}&phone=${encodeURIComponent(p)}`)); } catch (e: any) { if (!silent) setErr(e.message); } finally { if (!silent) setBusy(false); }
  };
  const payNow = async () => {
    if (!o) return; setPayBusy(true); setErr("");
    try { const g = await api<{ url: string }>("/api/payments/online/init", { method: "POST", body: { orderNo: o.orderNo, phone: phone.trim() } }); window.location.href = g.url; }
    catch (e: any) { setErr(e.message); setPayBusy(false); }
  };
  useEffect(() => { const u = new URLSearchParams(window.location.search); const n = u.get("no"), p = u.get("phone"); if (n && p) { setNo(n); setPhone(p); lookup(n, p); } }, []);
  // live refresh while the order is still moving (every 10 s with the rider on the road, every 30 s before that)
  const open = !!o && !["delivered", "cancelled", "returned"].includes(o.status); const onRoad = !!o && ["picked_up", "on_the_way"].includes(o.status);
  useEffect(() => {
    if (!open || !o) return; const n = o.orderNo, p = phone.trim();
    const t = setInterval(() => { if (document.visibilityState === "visible") lookup(n, p, true); }, onRoad ? 10_000 : 30_000);
    return () => clearInterval(t);
  }, [open, onRoad, o?.orderNo]); // eslint-disable-line react-hooks/exhaustive-deps
  const pins: Pin[] = o ? [...(o.riderLoc ? [{ id: "rider", kind: "rider" as const, lat: o.riderLoc.lat, lng: o.riderLoc.lng, label: o.riderName ?? "Rider" }] : []), ...(o.dest ? [{ id: "home", kind: "home" as const, lat: o.dest.lat, lng: o.dest.lng, label: "Your delivery location" }] : [])] : [];
  const km = o?.riderLoc && o.dest ? distanceKm(o.riderLoc, o.dest) : null;
  const stepIdx = o ? (o.status === "assigned" || o.status === "picked_up" ? 3 : STEPS.indexOf(o.status)) : -1;
  const dead = o && (o.status === "cancelled" || o.status === "returned");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Track your order</h1><p className="mt-1 text-sm text-gray-500">Enter the order number and the mobile number you used at checkout.</p>
      <form onSubmit={(e) => { e.preventDefault(); lookup(no.trim(), phone.trim()); }} className="mt-5 grid gap-3 rounded-2xl border bg-white p-5 shadow-card sm:grid-cols-[1fr_1fr_auto]">
        <input className="input uppercase" placeholder="Order no. (DM-XXXXXXX)" value={no} onChange={(e) => setNo(e.target.value)} required />
        <input className="input" placeholder="Mobile number" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <button className="btn-primary" disabled={busy}>{busy ? "Searching…" : "Track"}</button>
      </form>
      {err && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>}
      {o && (
        <div className="mt-5 space-y-5 rounded-2xl border bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-gray-500">Order</p><p className="text-lg font-extrabold text-primary">{o.orderNo}</p></div><div className="text-right"><p className="text-xs text-gray-500">Placed on</p><p className="text-sm font-medium">{fmtDateTime(o.createdAt)}</p></div></div>
          {dead ? <p className="rounded-xl bg-red-50 p-4 text-center font-semibold text-red-700">This order was {statusLabel(o.status).toLowerCase()}.</p> : (
            <ol className="flex items-start justify-between">{STEPS.map((s, k) => (
              <li key={s} className="flex flex-1 flex-col items-center text-center"><div className="flex w-full items-center"><div className={`h-1 flex-1 ${k === 0 ? "opacity-0" : k <= stepIdx ? "bg-primary" : "bg-gray-200"}`} /><div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${k <= stepIdx ? "bg-primary text-white" : "bg-gray-200 text-gray-500"}`}>{k <= stepIdx ? "✓" : k + 1}</div><div className={`h-1 flex-1 ${k === STEPS.length - 1 ? "opacity-0" : k < stepIdx ? "bg-primary" : "bg-gray-200"}`} /></div><p className={`mt-2 text-[11px] font-medium sm:text-xs ${k <= stepIdx ? "text-primary" : "text-gray-400"}`}>{statusLabel(s === "on_the_way" ? "on the way" : s)}</p></li>))}</ol>)}
          {o.payment && o.payment !== "cod" && <p className={`rounded-xl p-3 text-sm ${o.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-800" : o.paymentStatus === "failed" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>Payment ({o.payment}): <b>{o.paymentStatus === "paid" ? "Received ✓" : o.paymentStatus === "failed" ? "Could not be verified — please contact us" : o.paymentStatus === "pending" ? "Waiting for verification" : "Not paid yet"}</b></p>}
          {o.riderName && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary-soft p-3.5 text-sm"><span>🛵 Your delivery rider: <b>{o.riderName}</b></span>{o.riderPhone && <a href={`tel:${o.riderPhone}`} className="btn-primary btn-sm">Call {o.riderPhone}</a>}</div>}
          {onRoad && (pins.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold text-primary">📍 Live delivery tracking</span>
                {km !== null && <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-dark">{km < 0.05 ? "Your rider has arrived" : `${fmtDistance(km)} away · about ${roughEtaMin(km)} min`}</span>}</div>
              <LiveMap pins={pins} route height={280} />
              <p className="text-[11px] text-gray-400">{o.riderLoc ? `Updated ${o.riderLoc.ageSec < 10 ? "just now" : `${o.riderLoc.ageSec}s ago`} · refreshes automatically. ` : ""}{!o.dest && "You did not share your location at checkout, so only the rider is shown. "}{o.dest && <a className="font-medium text-primary" href={mapsDirections(o.dest)} target="_blank" rel="noopener noreferrer">Open your location in Google Maps</a>}</p>
            </div>) : <p className="rounded-xl bg-gray-50 p-3 text-center text-sm text-gray-500">🛵 Your order is with the rider. His live location will appear here as soon as it is shared.</p>)}
          {o.payment === "online" && o.paymentStatus !== "paid" && !["cancelled", "returned"].includes(o.status) && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900"><span>💳 Online payment {o.paymentStatus === "failed" ? "failed" : "not completed"} — pay {taka(o.total)} to confirm your order.</span><button className="btn-primary btn-sm" onClick={payNow} disabled={payBusy}>{payBusy ? "Please wait…" : "Pay now"}</button></div>}
          <ul className="divide-y rounded-xl border">{o.items.map((i) => <li key={i.id} className="flex justify-between p-3 text-sm"><span>{i.name} <span className="text-gray-500">× {i.qty}</span></span><span className="font-semibold">{taka(i.price * i.qty)}</span></li>)}</ul>
          <div className="ml-auto max-w-xs space-y-1 text-sm"><div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{taka(o.subtotal)}</span></div>{o.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>−{taka(o.discount)}</span></div>}<div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>{taka(o.delivery)}</span></div><div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span className="text-primary">{taka(o.total)}</span></div></div>
        </div>)}
    </div>
  );
}
