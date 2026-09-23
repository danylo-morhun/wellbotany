const isEmpty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * On a re-import, supplier content only fills fields that are still empty —
 * never overwrites edited/curated text (see docs/catalog-content-pass-plan.md).
 */
export function onlyEmptyFields<T extends Record<string, unknown>>(
  current: Record<string, unknown>,
  incoming: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(incoming).filter(([key, value]) => value !== undefined && isEmpty(current[key])),
  ) as Partial<T>;
}
