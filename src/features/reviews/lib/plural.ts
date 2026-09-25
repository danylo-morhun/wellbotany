/** 1 opinia, 2–4 / 22–24 opinie, 5–21 / 25+ opinii. */
export function pluralize(count: number): string {
  if (count === 1) return "opinia";
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return "opinie";
  return "opinii";
}
