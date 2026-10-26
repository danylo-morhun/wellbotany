// What the shopper typed at checkout, kept per tab (sessionStorage) so a detour —
// a reload, the privacy policy, the back button — doesn't wipe the form.
// Terms acceptance is never kept: it must be given fresh for each order.

const KEY = "wb-checkout-draft";

export type CheckoutDraft<T> = { cartId: string; step: number; data: Partial<T> };

/** Parses a stored draft; null when it's malformed or belongs to another cart. */
export function parseDraft<T extends object>(
  raw: string | null,
  cartId: string,
  defaults: T,
): { step: number; data: Partial<T> } | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const draft = parsed as Partial<CheckoutDraft<T>>;
  if (draft.cartId !== cartId) return null;
  const step = draft.step === 2 || draft.step === 3 ? draft.step : 1;
  const data: Partial<T> = {};
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const value = (draft.data as Partial<T> | undefined)?.[key];
    if (key !== "acceptedTerms" && typeof value === typeof defaults[key]) data[key] = value;
  }
  return { step, data };
}

export function readDraft<T extends object>(cartId: string, defaults: T) {
  try {
    return parseDraft(sessionStorage.getItem(KEY), cartId, defaults);
  } catch {
    return null;
  }
}

export function saveDraft<T extends { acceptedTerms: boolean }>(
  cartId: string,
  step: number,
  data: T,
) {
  const { acceptedTerms: _, ...rest } = data;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ cartId, step, data: rest }));
  } catch {}
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
