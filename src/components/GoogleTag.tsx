"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { ADS_ID, allowedGoogleTags, GA_ID, syncGtag } from "@/lib/analytics";
import { CONSENT_CHANGE_EVENT, clearCookies } from "@/lib/consent";

/** Loads gtag.js once GA4 (analytics) or Google Ads (marketing) is allowed in CookieBanner. */
export function GoogleTag() {
  // The id gtag.js is loaded with; other destinations are added by config
  const [loaderId, setLoaderId] = useState<string | null>(null);

  useEffect(() => {
    const apply = () => {
      const { analytics, ads } = allowedGoogleTags();
      // gtag.js can't be unloaded — a change of mind flips the consent state
      syncGtag();
      if (!analytics) clearCookies("_ga");
      if (!ads) clearCookies("_gcl");
      const id = analytics ? GA_ID : ads ? ADS_ID : undefined;
      if (id) setLoaderId((current) => current ?? id);
    };
    apply();
    window.addEventListener(CONSENT_CHANGE_EVENT, apply);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, apply);
  }, []);

  if (!loaderId) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${loaderId}`}
      strategy="afterInteractive"
    />
  );
}
