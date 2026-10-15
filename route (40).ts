import { db } from "@/server/db";
import { ApiError, clientIp, handle, ok, rateLimit, readJson } from "@/server/http";
import { setOrderStatus } from "@/server/services";
import type { Order } from "@/lib/types";
export const dynamic = "force-dynamic";

const WINDOW_MS = 2 * 60_000; // 2 minutes

/** Customer cancel: orderNo + phone, only within 2 minutes while still pending/confirmed. */
export const POST = handle(async (req) => {
  rateLimit(`cancel:${clientIp(req)}`, 10, 10 * 60_000);
  const body = await readJson(req) as { orderNo?: string; phone?: string };
  const no = (body.orderNo ?? "").trim().toUpperCase();
  const phone = (body.phone ?? "").trim();
  if (!no || !phone) throw new ApiError(400, "Order number and phone are required");

  const o = (await db.list<Order>("orders")).find((x) => x.orderNo === no && x.phone === phone);
  if (!o) throw new ApiError(404, "No order found with these details");

  if (!["pending", "confirmed"].includes(o.status)) {
    throw new ApiError(400, "This order can no longer be cancelled online. Please contact support.");
  }
  const age = Date.now() - new Date(o.createdAt).getTime();
  if (age > WINDOW_MS) {
    throw new ApiError(400, "Cancellation window (2 minutes) has expired. Please contact support.");
  }

  const updated = await setOrderStatus(o.id, "cancelled");
  return ok({ orderNo: updated.orderNo, status: updated.status });
});
