import { db } from "@/server/db";
import { ApiError, clientIp, handle, ok, rateLimit } from "@/server/http";
import type { Order, Rider } from "@/lib/types";
export const dynamic = "force-dynamic";

/** Public order tracking: needs BOTH order number and the phone used at checkout. */
export const GET = handle(async (req) => {
  rateLimit(`track:${clientIp(req)}`, 20, 10 * 60_000);
  const u = new URL(req.url).searchParams; const no = (u.get("no") ?? "").trim().toUpperCase(), phone = (u.get("phone") ?? "").trim();
  if (!no || !phone) throw new ApiError(400, "Enter your order number and phone number");
  const o = (await db.list<Order>("orders")).find((x) => x.orderNo === no && x.phone === phone);
  if (!o) throw new ApiError(404, "No order found with these details");
  const withRider = ["picked_up", "on_the_way"].includes(o.status) && o.riderId; // the rider is only shown on the map once he has the parcel
  const r = withRider ? await db.get<Rider>("riders", o.riderId!) : null;
  const ageSec = r?.locAt ? Math.max(0, Math.round((Date.now() - new Date(r.locAt).getTime()) / 1000)) : null;
  const riderLoc = r && typeof r.lat === "number" && typeof r.lng === "number" && ageSec !== null && ageSec < 900 ? { lat: r.lat, lng: r.lng, ageSec } : null;
  return ok({ ...(typeof o.lat === "number" && typeof o.lng === "number" ? { dest: { lat: o.lat, lng: o.lng } } : {}), ...(riderLoc ? { riderLoc } : {}), orderNo: o.orderNo, status: o.status, createdAt: o.createdAt, updatedAt: o.updatedAt, items: o.items, subtotal: o.subtotal, delivery: o.delivery, discount: o.discount, total: o.total, payment: o.payment, paymentStatus: o.paymentStatus, zoneName: o.zoneName, ...(["assigned", "picked_up", "on_the_way"].includes(o.status) && o.riderName ? { riderName: o.riderName, riderPhone: o.riderPhone } : {}) });
});
