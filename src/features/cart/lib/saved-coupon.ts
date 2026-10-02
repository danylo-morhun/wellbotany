// The coupon code a visitor brought in (?kod= from the welcome e-mail) or
// verified in the cart — pre-filled in the cart and at checkout so it isn't
// retyped. Client-only; storage can be unavailable (private mode).

const KEY = "wb-coupon";

export function readSavedCoupon(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveCoupon(code: string) {
  try {
    localStorage.setItem(KEY, code.trim().toUpperCase());
  } catch {}
}

export function clearSavedCoupon() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Moves ?kod= from the URL into storage and strips it from the address bar. */
export function captureCouponFromUrl() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("kod");
  if (!code) return;
  saveCoupon(code);
  url.searchParams.delete("kod");
  window.history.replaceState(window.history.state, "", url);
}
