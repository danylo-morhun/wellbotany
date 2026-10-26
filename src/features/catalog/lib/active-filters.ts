const LIST_PARAMS = ["kategoria", "marka", "tagi"] as const;
const FLAG_PARAMS = ["dostepne", "promocje", "nowosci", "polecane"] as const;

/** Number of filters set in the URL — the same items ActiveFilterChips shows
 * (a price range counts once). */
export function activeFilterCount(params: URLSearchParams): number {
  let count = 0;
  for (const key of LIST_PARAMS) {
    count += params.get(key)?.split(",").filter(Boolean).length ?? 0;
  }
  if (params.get("cenaMin") || params.get("cenaMax")) count += 1;
  for (const key of FLAG_PARAMS) {
    if (params.get(key) === "1") count += 1;
  }
  return count;
}
