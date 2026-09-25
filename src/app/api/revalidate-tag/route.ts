import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { POSTS_TAG } from "@/features/blog/lib/queries";
import { GLOSSARY_TAG } from "@/features/glossary/lib/queries";
import { SHOP_SETTINGS_TAG } from "@/features/settings/lib/shop-settings";
import { auth } from "@/lib/auth";
import { safeCompare } from "@/lib/timing-safe-equal";

// Every catalog cache tag — used after bulk DB changes made outside the admin
// (imports, content scripts), which don't revalidate on their own
const TAGS = [
  "products",
  "categories",
  "brands",
  "tags",
  "redirects",
  SHOP_SETTINGS_TAG,
  GLOSSARY_TAG,
  POSTS_TAG,
];

// An open endpoint would let anyone force every cached page to rebuild.
// Accepted: the cron secret, a dedicated REVALIDATE_SECRET (scripts), or a
// logged-in admin opening the URL in the browser.
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const header = req.headers.get("authorization") ?? "";
  for (const secret of [process.env.CRON_SECRET, process.env.REVALIDATE_SECRET]) {
    if (secret && safeCompare(header, `Bearer ${secret}`)) return true;
  }
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  for (const tag of TAGS) revalidateTag(tag, "max");
  return NextResponse.json({ ok: true, revalidated: TAGS });
}
