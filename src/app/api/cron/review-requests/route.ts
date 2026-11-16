// Daily (wb-review-requests.timer, 11:00): asks for a review once the parcel
// has surely arrived, so the request doesn't depend on someone setting the
// order to DELIVERED by hand. Polityka prywatności: one request after delivery.
import { NextResponse } from "next/server";
import { requestOrderReview } from "@/features/reviews/lib/request";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/timing-safe-equal";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
// Shipping promise is 2 working days + 1–2 days in transit: a week covers a weekend
const REVIEW_AFTER_DAYS = 7;
// Older shipments are left alone — a request a month later would confuse
const REVIEW_LOOKBACK_DAYS = 30;

export async function GET(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeCompare(header, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const due = await prisma.order.findMany({
    where: {
      status: { in: ["SHIPPED", "DELIVERED"] },
      reviewRequestedAt: null,
      shippedAt: {
        lte: new Date(now - REVIEW_AFTER_DAYS * DAY),
        gte: new Date(now - REVIEW_LOOKBACK_DAYS * DAY),
      },
    },
    select: { id: true, orderNumber: true },
    orderBy: { shippedAt: "asc" },
  });

  const requested: string[] = [];
  const failed: string[] = [];
  for (const order of due) {
    try {
      if (await requestOrderReview(order.id)) requested.push(order.orderNumber);
    } catch (e) {
      console.error(`[review-requests] ${order.orderNumber}:`, e);
      failed.push(order.orderNumber);
    }
  }

  return NextResponse.json({ ok: failed.length === 0, requested, failed });
}
