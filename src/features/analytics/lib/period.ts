// Report periods in shop-local (Warsaw) calendar days. Pure — `now` is passed in.

export const SHOP_TZ = "Europe/Warsaw";
const DAY = 86400000;

/** "2026-10-29" — the shop-local calendar day of an instant */
export const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: SHOP_TZ });

/** "2026-10-01" shifted by whole calendar days (UTC arithmetic — no DST surprises) */
export const addDays = (key: string, n: number) =>
  new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** The instant a shop-local calendar day starts */
export function shopMidnight(key: string): Date {
  const utc = new Date(`${key}T00:00:00Z`);
  const offset =
    new Date(utc.toLocaleString("en-US", { timeZone: SHOP_TZ })).getTime() -
    new Date(utc.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(utc.getTime() - offset);
}

export const PERIODS = {
  "7": "7 dni",
  "30": "30 dni",
  "90": "90 dni",
  miesiac: "Ten miesiąc",
  "poprz-miesiac": "Poprzedni miesiąc",
} as const;
export type PeriodKey = keyof typeof PERIODS;

export type Period = {
  key: PeriodKey;
  /** First and last shop-local day, inclusive */
  from: string;
  to: string;
  days: number;
  start: Date;
  /** Exclusive end */
  end: Date;
  /** The same number of days right before — for "vs poprz. okres" */
  prevStart: Date;
};

export function resolvePeriod(raw: string | undefined, now: Date): Period {
  const key: PeriodKey = raw && raw in PERIODS ? (raw as PeriodKey) : "30";
  const today = dayKey(now);
  const monthStart = `${today.slice(0, 8)}01`;
  let from: string;
  let to = today;
  if (key === "miesiac") from = monthStart;
  else if (key === "poprz-miesiac") {
    to = addDays(monthStart, -1);
    from = `${to.slice(0, 8)}01`;
  } else from = addDays(today, 1 - Number(key));
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  return {
    key,
    from,
    to,
    days,
    start: shopMidnight(from),
    end: shopMidnight(addDays(to, 1)),
    prevStart: shopMidnight(addDays(from, -days)),
  };
}
