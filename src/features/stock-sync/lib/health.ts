// Is the Subiekt agent alive? Pure — `now` is passed in. The shop PC runs only
// in shop hours, so silence outside them is normal.

const SHOP_TZ = "Europe/Warsaw";
/** The agent sends a heartbeat every 3 min; allow a few missed ones */
export const STALE_MINUTES = 20;
/** Shop-local [open, close) in minutes after midnight by weekday (0 = Sunday) */
const OPEN: Record<number, [number, number]> = {
  1: [9 * 60, 18 * 60],
  2: [9 * 60, 18 * 60],
  3: [9 * 60, 18 * 60],
  4: [9 * 60, 18 * 60],
  5: [9 * 60, 18 * 60],
  6: [9 * 60, 14 * 60],
};

/** True when the shop has been open for at least STALE_MINUTES */
export function shopOpenLongEnough(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOP_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  const hours = OPEN[day];
  return !!hours && minutes >= hours[0] + STALE_MINUTES && minutes < hours[1];
}

export type SyncProblem = "silent" | "error" | null;

/** What's wrong with the latest run, if the agent should be running now */
export function syncProblem(
  last: { createdAt: Date; error: string | null } | null,
  now: Date,
): SyncProblem {
  if (!shopOpenLongEnough(now)) return null;
  if (!last || now.getTime() - last.createdAt.getTime() > STALE_MINUTES * 60000) return "silent";
  return last.error ? "error" : null;
}
