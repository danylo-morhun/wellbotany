// Web orders not yet in Subiekt, for the shop agent to write as EDI++ files
// (docs/plans/subiekt-sync-research.md §6). Same auth as the stock endpoint.
import { type NextRequest, NextResponse } from "next/server";
import { pendingSubiektOrders } from "@/features/stock-sync/lib/orders";
import { authenticate } from "@/features/stock-sync/lib/signature";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // GET has no body — the agent signs an empty one
  if (!authenticate(req.headers, "")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, orders: await pendingSubiektOrders() });
}
