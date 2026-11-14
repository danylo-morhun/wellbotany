import { isPolishHoliday } from "@/lib/business-days";

// The shop agent's heartbeat: every accepted request stores its time in Redis
// (no Postgres), and the uptime check asks whether it went quiet while the
// shop PC should be on.

export const heartbeatKey = (code: string) => `stock-sync:heartbeat:${code}`;

// Agent runs every 3 min; this leaves room for a slow cycle or two
const MAX_SILENCE_MS = 15 * 60 * 1000;
// The PC is switched on at opening — give the service time to start
const GRACE_AFTER_OPENING_MIN = 20;

// Shop hours in Warsaw time, by ISO weekday (1 = Monday); the PC is off outside them
const SHOP_HOURS: Record<number, [open: number, close: number]> = {
  1: [9, 18],
  2: [9, 18],
  3: [9, 18],
  4: [9, 18],
  5: [9, 18],
  6: [9, 14],
};

function warsawClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return {
    year: Number(get("year")),
    monthDay: `${get("month")}-${get("day")}`,
    weekday,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Whether the agent should be sending right now (shop open, past the start-up grace). */
export function agentExpected(now: Date): boolean {
  const { year, monthDay, weekday, minutes } = warsawClock(now);
  const hours = SHOP_HOURS[weekday];
  if (!hours || isPolishHoliday(year, monthDay)) return false;
  return minutes >= hours[0] * 60 + GRACE_AFTER_OPENING_MIN && minutes < hours[1] * 60;
}

/** null = fine; otherwise why the uptime check should fail. */
export function heartbeatProblem(lastBeat: string | null, now: Date): string | null {
  if (!agentExpected(now)) return null;
  if (!lastBeat) return "no heartbeat recorded";
  const silentMs = now.getTime() - new Date(lastBeat).getTime();
  if (!(silentMs <= MAX_SILENCE_MS)) {
    return `no heartbeat for ${Math.round(silentMs / 60000)} min`;
  }
  return null;
}
