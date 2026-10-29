// Polled by the Uptime workflow: 503 when the shop agent went quiet during shop
// hours. Reads Redis only, so it never wakes the database.
import { type NextRequest, NextResponse } from "next/server";
import { heartbeatKey, heartbeatProblem } from "@/features/stock-sync/lib/heartbeat";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const LOCATION_CODE = /^[a-z0-9]{1,32}$/;

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "sklep1";
  if (!LOCATION_CODE.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid code" }, { status: 400 });
  }
  if (!redis) {
    return NextResponse.json({ ok: false, error: "redis not configured" }, { status: 503 });
  }

  const lastBeat = await redis.get<string>(heartbeatKey(code));
  const problem = heartbeatProblem(lastBeat, new Date());
  return NextResponse.json(
    { ok: !problem, lastBeat, ...(problem && { error: problem }) },
    { status: problem ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
