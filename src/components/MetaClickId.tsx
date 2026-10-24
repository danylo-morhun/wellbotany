"use client";

import { useEffect } from "react";
import { CONSENT_CHANGE_EVENT, clearCookies, hasMarketingConsent } from "@/lib/consent";

export const FBC_COOKIE = "_fbc";
const FBC_MAX_AGE = 90 * 24 * 60 * 60; // Meta's click attribution window

// Read at load, kept in memory only: before consent nothing may be stored,
// and the visitor usually answers the banner after the first navigation.
const landingFbclid =
  typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("fbclid");

/**
 * Keeps Meta's click id (fbclid from an ad link) as the first-party _fbc
 * cookie, only with marketing consent. Checkout passes it to the Conversions
 * API so the purchase can be matched to the ad click — no Meta script runs here.
 */
export function MetaClickId() {
  useEffect(() => {
    const apply = () => {
      if (!hasMarketingConsent()) {
        clearCookies(FBC_COOKIE);
        return;
      }
      if (!landingFbclid) return;
      const value = `fb.1.${Date.now()}.${landingFbclid}`;
      document.cookie = `${FBC_COOKIE}=${encodeURIComponent(value)}; Max-Age=${FBC_MAX_AGE}; path=/; SameSite=Lax; Secure`;
    };
    apply();
    window.addEventListener(CONSENT_CHANGE_EVENT, apply);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, apply);
  }, []);
  return null;
}

export function readFbc(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
