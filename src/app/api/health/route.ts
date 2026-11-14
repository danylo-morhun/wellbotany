// Polled by the Uptime workflow: 503 when the database, Redis or the nightly
// backups are not OK. Answers only booleans — no paths, sizes or errors.
import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

// Nightly dump at ~03:15 Warsaw; a day plus slack before it counts as missed
const BACKUP_MAX_AGE_MS = 27 * 60 * 60 * 1000;

async function freshMarker(dir: string, name: string, now: number): Promise<boolean> {
  try {
    const { mtimeMs } = await stat(path.join(dir, name));
    return now - mtimeMs <= BACKUP_MAX_AGE_MS;
  } catch {
    return false;
  }
}

const ok = (p: Promise<unknown>) =>
  p.then(
    () => true,
    (e) => {
      console.error("health:", e);
      return false;
    },
  );

export async function GET() {
  const now = Date.now();
  // Markers written by wb-pg-backup after each step succeeds (prod only)
  const dir = process.env.BACKUP_DIR;
  const [db, cache, backup, offsite] = await Promise.all([
    ok(prisma.shopSettings.findFirst({ select: { id: true } })),
    redis ? ok(redis.get("health:ping")) : Promise.resolve(false),
    dir ? freshMarker(dir, ".backup-ok", now) : Promise.resolve(true),
    dir ? freshMarker(dir, ".offsite-ok", now) : Promise.resolve(true),
  ]);
  const checks = { db, redis: cache, backup, offsite };
  const healthy = Object.values(checks).every(Boolean);
  return NextResponse.json(
    { ok: healthy, checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
