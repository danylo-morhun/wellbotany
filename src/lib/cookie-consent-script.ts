import { CONSENT_STORAGE_KEY } from "./consent";

// Runs before paint: marks <html data-cookie-consent> so CSS hides the
// server-rendered banner for returning visitors (see CookieBanner). A v1
// "accepted" isn't marked — it predates the marketing category, so the banner
// decides after hydration whether to ask again.
export const COOKIE_CONSENT_BOOT_SCRIPT = `try{var c=localStorage.getItem("${CONSENT_STORAGE_KEY}");if(c==="rejected"||(c&&c.charAt(0)==="{"))document.documentElement.dataset.cookieConsent="1"}catch(e){}`;

// Strict-CSP routes allow the inline script by hash (no nonce in the static root
// layout). tests/unit/cookie-consent-script.test.ts fails when the script drifts.
export const COOKIE_CONSENT_SCRIPT_HASH = "sha256-ODvsd3UzpsSA/QMfmCwTvh6w9DN/HSLrBP9xBsR866w=";
