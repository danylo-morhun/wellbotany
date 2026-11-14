// Polish working days: Monday–Friday except statutory days off (ustawa o dniach
// wolnych od pracy). Dates are calendar days in Warsaw.

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

export function isPolishHoliday(year: number, monthDay: string): boolean {
  // Easter Monday and Corpus Christi move with Easter (Sundays are closed anyway)
  return (
    FIXED_HOLIDAYS.has(monthDay) ||
    monthDay === easterBased(year, 1) ||
    monthDay === easterBased(year, 60)
  );
}

const warsawDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Warsaw calendar date of an instant, as "YYYY-MM-DD". */
export function warsawDay(at: Date): string {
  return warsawDate.format(at);
}

function isBusinessDay(day: string): boolean {
  const date = new Date(`${day}T12:00:00Z`);
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !isPolishHoliday(Number(day.slice(0, 4)), day.slice(5));
}

/** Calendar day `n` days after `day` ("YYYY-MM-DD"). */
export function addDays(day: string, n: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

/** The n-th working day after `day` (the day itself doesn't count). */
export function addBusinessDays(day: string, n: number): string {
  let current = day;
  let left = n;
  while (left > 0) {
    current = addDays(current, 1);
    if (isBusinessDay(current)) left--;
  }
  return current;
}
