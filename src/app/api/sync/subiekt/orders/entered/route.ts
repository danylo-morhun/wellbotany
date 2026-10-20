// The shop agent reports orders it found entered in Subiekt — they stop
// holding back synced stock (see onlineStock in features/stock-sync/lib/plan.ts).
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { markEnteredInSubiekt } from "@/features/stock-sync/lib/orders";
import { authenticate } from "@/features/stock-sync/lib/signature";
import { enteredOrdersSchema } from "@/features/stock-sync/schema";

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!authenticate(req.headers, body)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const parsed = enteredOrdersSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  const updated = await markEnteredInSubiekt(parsed.data.orderNumbers);
  if (updated > 0) revalidatePath("/admin/zamowienia", "layout");
  return NextResponse.json({ ok: true, updated });
}
