// Daily resync of price + availability to Google Merchant Center (see
// src/lib/merchant.ts). Admin saves push immediately; this covers changes made
// outside the admin and keeps the supplemental source from going stale.
import { NextResponse } from "next/server";
import { syncAllToMerchant } from "@/lib/merchant";
import { safeCompare } from "@/lib/timing-safe-equal";

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeCompare(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await syncAllToMerchant();
  return NextResponse.json({ ok: true, ...result });
}
