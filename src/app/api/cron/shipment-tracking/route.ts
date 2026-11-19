// Every 30 min (wb-shipment-tracking.timer): parcel states from epaka move
// orders to SHIPPED / DELIVERED and raise delivery-problem alerts.
import { NextResponse } from "next/server";
import { isEpakaConfigured } from "@/features/shipping/lib/epaka";
import { syncShipments } from "@/features/shipping/lib/tracking-sync";
import { safeCompare } from "@/lib/timing-safe-equal";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeCompare(header, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isEpakaConfigured()) {
    return NextResponse.json({ ok: false, error: "epaka not configured" }, { status: 503 });
  }
  const result = await syncShipments();
  return NextResponse.json({ ok: result.failed.length === 0, ...result });
}
