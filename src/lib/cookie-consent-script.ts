import { CONSENT_STORAGE_KEY } from "./analytics";

// Runs before paint: marks <html data-cookie-consent> so CSS hides the
// server-rendered banner for returning visitors (see CookieBanner).
export const COOKIE_CONSENT_BOOT_SCRIPT = `try{var c=localStorage.getItem("${CONSENT_STORAGE_KEY}");if(c==="accepted"||c==="rejected")document.documentElement.dataset.cookieConsent=c}catch(e){}`;

// Strict-CSP routes allow the inline script by hash (no nonce in the static root
// layout). tests/unit/cookie-consent-script.test.ts fails when the script drifts.
export const COOKIE_CONSENT_SCRIPT_HASH = "sha256-YvnwUGnnRKSfmoZPyQEaD8Tu5HtlXO+aRSypqJfZA2A=";
