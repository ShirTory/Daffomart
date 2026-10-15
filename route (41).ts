import { clientIp, handle, ok, rateLimit, readJson } from "@/server/http";
import { cancelOrderByCustomer } from "@/server/services";
import { z } from "zod";
export const dynamic = "force-dynamic";

const body = z.object({
  orderNo: z.string().trim().min(3),
  phone: z.string().trim().min(10),
});

/** Public: customer cancels their own order within 2 minutes (orderNo + phone required). */
export const POST = handle(async (req) => {
  rateLimit(`cancel:${clientIp(req)}`, 8, 10 * 60_000);
  const { orderNo, phone } = body.parse(await readJson(req));
  const o = await cancelOrderByCustomer(orderNo, phone);
  return ok({ orderNo: o.orderNo, status: o.status });
});
