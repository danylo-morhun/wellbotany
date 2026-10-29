// Daily resync of price + availability to Google Merchant Center (see
// src/lib/merchant.ts). Admin saves push immediately; this covers changes made
// outside the admin and keeps the supplemental source from going stale.
// Bulk scripts (e.g. prices-from-subiekt) call it with REVALIDATE_SECRET right
// after writing, instead of waiting for the night run.
import { NextResponse } from "next/server";
import { syncAllToMerchant } from "@/lib/merchant";
import { safeCompare } from "@/lib/timing-safe-equal";

export const maxDuration = 300;

export async function GET(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const authorized = [process.env.CRON_SECRET, process.env.REVALIDATE_SECRET].some(
    (secret) => secret && safeCompare(header, `Bearer ${secret}`),
  );
  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncAllToMerchant();
  return NextResponse.json({ ok: true, ...result });
}
