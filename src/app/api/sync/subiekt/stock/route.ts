// Stock snapshots from the Subiekt GT agent running on a shop PC
// (docs/plans/subiekt-sync-research.md). Off until SUBIEKT_SYNC_SECRET_<CODE>
// is set for the location.
import { revalidateTag } from "next/cache";
import { after, type NextRequest, NextResponse } from "next/server";
import { applySnapshot } from "@/features/stock-sync/lib/apply";
import { authenticate } from "@/features/stock-sync/lib/signature";
import { stockSnapshotSchema } from "@/features/stock-sync/schema";
import { syncProductsToMerchant } from "@/lib/merchant";
import { redis } from "@/lib/redis";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Signature is checked on the raw body, before anything is parsed
  const body = await req.text();
  const code = authenticate(req.headers, body);
  if (!code) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const parsed = stockSnapshotSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  // An empty delta is only the agent's heartbeat: keep it out of Postgres, so
  // the DB isn't woken (and the whole catalog isn't read) every few minutes
  if (parsed.data.mode === "delta" && parsed.data.items.length === 0) {
    await redis?.set(`stock-sync:heartbeat:${code}`, new Date().toISOString()).catch(console.error);
    return NextResponse.json({ ok: true, changedLevels: 0, changedVariants: 0, unmatched: 0 });
  }

  const result = await applySnapshot(code, parsed.data);
  if (!result.ok) {
    // 422 tells the agent the data looked wrong — it alerts instead of retrying
    return NextResponse.json(result, { status: 422 });
  }

  if (result.changedVariants > 0) revalidateTag("products", { expire: 0 });
  if (result.restockedOrSoldOut.length > 0) {
    after(() => syncProductsToMerchant(result.restockedOrSoldOut).catch(console.error));
  }
  const { restockedOrSoldOut: _, ...summary } = result;
  return NextResponse.json(summary);
}
