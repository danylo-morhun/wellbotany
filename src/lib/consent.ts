// Cookie consent (client-only): which optional categories the visitor allowed
// in CookieBanner. Analytics = GA4; marketing = Google Ads conversions and the
// Meta Conversions API. Nothing optional runs without its category.

import { recordConsent } from "@/features/consent/actions";
import { MARKETING_ENABLED } from "./marketing-config";

export const CONSENT_STORAGE_KEY = "cookie-consent";
export const CONSENT_CHANGE_EVENT = "cookie-consent:change";
export const OPEN_COOKIE_SETTINGS_EVENT = "cookie-consent:open";
// Bump when the banner text changes in substance — logged with every choice
export const CONSENT_VERSION = 2;

// The marketing category exists only once a Google Ads or Meta account is connected
export { MARKETING_ENABLED };

export type Consent = { analytics: boolean; marketing: boolean };
type StoredConsent = Consent & { v: number; id: string };

// v1 stored a bare "accepted" (analytics only) or "rejected"
const LEGACY_ACCEPTED = "accepted";
const LEGACY_REJECTED = "rejected";

export function parseConsent(raw: string | null): StoredConsent | null {
  if (raw === LEGACY_REJECTED) return { analytics: false, marketing: false, v: 1, id: "" };
  if (raw === LEGACY_ACCEPTED) return { analytics: true, marketing: false, v: 1, id: "" };
  if (!raw?.startsWith("{")) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value.analytics !== "boolean" || typeof value.marketing !== "boolean") return null;
    return {
      analytics: value.analytics,
      marketing: value.marketing,
      v: Number(value.v) || 0,
      id: String(value.id ?? ""),
    };
  } catch {
    return null;
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readConsent(): Consent | null {
  const stored = parseConsent(readRaw());
  return stored && { analytics: stored.analytics, marketing: stored.marketing };
}

/**
 * True when the banner should ask: no choice yet, or a v1 "accepted" that
 * predates the marketing category (it covered analytics only). A v1
 * "rejected" refused everything, so it isn't asked again.
 */
export function needsConsentPrompt(raw: string | null = readRaw()): boolean {
  const stored = parseConsent(raw);
  if (!stored) return true;
  return raw === LEGACY_ACCEPTED && MARKETING_ENABLED;
}

export function hasAnalyticsConsent() {
  return readConsent()?.analytics === true;
}

export function hasMarketingConsent() {
  return MARKETING_ENABLED && readConsent()?.marketing === true;
}

function newConsentId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Stores the choice, tells the tags (CONSENT_CHANGE_EVENT) and logs it
 * server-side. `log: false` for silent migrations that aren't a new choice.
 */
export function saveConsent(consent: Consent, { log = true } = {}) {
  const id = parseConsent(readRaw())?.id || newConsentId();
  const stored: StoredConsent = {
    analytics: consent.analytics,
    marketing: MARKETING_ENABLED && consent.marketing,
    v: CONSENT_VERSION,
    id,
  };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Private mode — the choice lasts for this page view only
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: stored }));
  if (log) {
    recordConsent({
      consentId: id,
      analytics: stored.analytics,
      marketing: stored.marketing,
      version: CONSENT_VERSION,
    }).catch(() => {
      // The choice still applies locally; a lost log entry isn't worth an error
    });
  }
}

/** Removes first-party cookies by name prefix on every domain level GA/Ads may use. */
export function clearCookies(prefix: string) {
  const host = window.location.hostname;
  // Set on the top-level domain (".wellbotany.pl"), so try each level
  const domains = host.split(".").map((_, i, parts) => parts.slice(i).join("."));
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!name.startsWith(prefix)) continue;
    for (const domain of ["", ...domains.map((d) => `; domain=.${d}`)])
      document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
  }
}
