// After a bulk DB edit made outside the admin: expire every cache tag on the
// live site and, when prices or availability changed, resync Merchant Center.
// Secret: REVALIDATE_SECRET or ~/.config/wellbotany/revalidate-secret (runbook).
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SITE = process.env.SITE_URL ?? "https://wellbotany.pl";

function secret(): string {
  if (process.env.REVALIDATE_SECRET) return process.env.REVALIDATE_SECRET;
  const file = join(homedir(), ".config/wellbotany/revalidate-secret");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  throw new Error("no REVALIDATE_SECRET — set it or create ~/.config/wellbotany/revalidate-secret");
}

async function call(path: string) {
  const res = await fetch(`${SITE}${path}`, { headers: { Authorization: `Bearer ${secret()}` } });
  const body = await res.text();
  console.log(`${path} → ${res.status} ${body.slice(0, 200)}`);
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
}

export async function refreshSite({ merchant }: { merchant: boolean }) {
  await call("/api/revalidate-tag");
  if (merchant) await call("/api/cron/merchant-sync");
}
