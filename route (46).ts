import { z } from "zod";
import { db } from "@/server/db";
import { ApiError, clientIp, handle, ok, rateLimit, readJson } from "@/server/http";
import { gateway } from "@/server/payments";
import type { Order } from "@/lib/types";
export const dynamic = "force-dynamic";

/** Customer → pay an existing online-payment order. Needs order no. + phone (same check as tracking). */
export const POST = handle(async (req) => {
  rateLimit(`pay:${clientIp(req)}`, 20, 10 * 60_000);
  const { orderNo, phone } = z.object({ orderNo: z.string().min(3), phone: z.string().min(5) }).parse(await readJson(req));
  const gw = gateway(); if (!gw) throw new ApiError(503, "Online payment is not available yet");
  const o = (await db.list<Order>("orders")).find((x) => x.orderNo === orderNo.toUpperCase() && x.phone === phone);
  if (!o || o.payment !== "online") throw new ApiError(404, "Order not found");
  if (o.paymentStatus === "paid") throw new ApiError(409, "This order is already paid");
  return ok(await gw.init(o, new URL(req.url).origin));
});
