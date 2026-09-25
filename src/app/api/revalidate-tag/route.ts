import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { SHOP_SETTINGS_TAG } from "@/features/settings/lib/shop-settings";
import { safeCompare } from "@/lib/timing-safe-equal";

// Every catalog cache tag — used after bulk DB changes made outside the admin
// (imports, content scripts), which don't revalidate on their own
const TAGS = ["products", "categories", "brands", "tags", "redirects", SHOP_SETTINGS_TAG];

// Same secret as the cron routes: an open endpoint would let anyone force
// every cached page to rebuild
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeCompare(req.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  for (const tag of TAGS) revalidateTag(tag, "max");
  return NextResponse.json({ ok: true, revalidated: TAGS });
}
