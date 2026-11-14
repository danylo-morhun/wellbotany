// Product cards from the Subiekt GT agent (prices, purchase cost, VAT, supplier),
// a few times a day. Stored as a reference copy; only purchase costs flow into
// products. Same signature and secret as /stock.
import { type NextRequest, NextResponse } from "next/server";
import { applyCatalog } from "@/features/stock-sync/lib/catalog-apply";
import { authenticate } from "@/features/stock-sync/lib/signature";
import { catalogSnapshotSchema } from "@/features/stock-sync/schema";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
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
  const parsed = catalogSnapshotSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }
  // A full catalog with no cards is a broken query, not an empty shop
  if (parsed.data.mode === "full" && parsed.data.items.length === 0) {
    return NextResponse.json({ ok: false, error: "full catalog with no cards" }, { status: 422 });
  }

  return NextResponse.json(await applyCatalog(code, parsed.data));
}
