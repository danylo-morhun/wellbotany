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

// Statutory days off in Poland (ustawa o dniach wolnych od pracy) — the shop is closed
const FIXED_HOLIDAYS = new Set([
  "01-01",
  "01-06",
  "05-01",
  "05-03",
  "08-15",
  "11-01",
  "11-11",
  "12-24",
  "12-25",
  "12-26",
]);

/** Easter Sunday (Gregorian, anonymous algorithm) as "MM-DD" plus an offset in days. */
function easterBased(year: number, offsetDays: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return date.toISOString().slice(5, 10);
}

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

function isHoliday(year: number, monthDay: string): boolean {
  // Easter Monday and Corpus Christi move with Easter (Sundays are closed anyway)
  return (
    FIXED_HOLIDAYS.has(monthDay) ||
    monthDay === easterBased(year, 1) ||
    monthDay === easterBased(year, 60)
  );
}

/** Whether the agent should be sending right now (shop open, past the start-up grace). */
export function agentExpected(now: Date): boolean {
  const { year, monthDay, weekday, minutes } = warsawClock(now);
  const hours = SHOP_HOURS[weekday];
  if (!hours || isHoliday(year, monthDay)) return false;
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
