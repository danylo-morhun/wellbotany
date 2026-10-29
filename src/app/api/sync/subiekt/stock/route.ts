// Stock snapshots from the Subiekt GT agent running on a shop PC
// (docs/plans/subiekt-sync-research.md). Off until SUBIEKT_SYNC_SECRET_<CODE>
// is set for the location.
import { revalidateTag } from "next/cache";
import { after, type NextRequest, NextResponse } from "next/server";
import { productTag } from "@/features/catalog/lib/product-tag";
import { applySnapshot } from "@/features/stock-sync/lib/apply";
import { heartbeatKey } from "@/features/stock-sync/lib/heartbeat";
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

  // The agent's heartbeat lives in Redis, so syncs that change nothing never wake Postgres
  await redis?.set(heartbeatKey(code), new Date().toISOString()).catch(console.error);
  if (parsed.data.mode === "delta" && parsed.data.items.length === 0) {
    return NextResponse.json({ ok: true, changedLevels: 0, changedVariants: 0, unmatched: 0 });
  }

  const result = await applySnapshot(code, parsed.data);
  if (!result.ok) {
    // 422 tells the agent the data looked wrong — it alerts instead of retrying
    return NextResponse.json(result, { status: 422 });
  }

  if (result.restockedOrSoldOut.length > 0) {
    // Availability flipped: listings, filters and the home page show it too
    revalidateTag("products", { expire: 0 });
    after(() => syncProductsToMerchant(result.restockedOrSoldOut).catch(console.error));
  } else {
    // Only counts moved: refresh those product pages and leave the rest of
    // the catalog cached, so every sale doesn't re-render the shop from the DB
    for (const slug of result.changedProductSlugs) revalidateTag(productTag(slug), { expire: 0 });
  }
  const { restockedOrSoldOut: _, changedProductSlugs: __, ...summary } = result;
  return NextResponse.json(summary);
}
