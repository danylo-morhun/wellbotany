"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  CONSENT_CHANGE_EVENT,
  clearGaCookies,
  hasAnalyticsConsent,
  initGtag,
} from "@/lib/analytics";

/** Loads GA4 only after the visitor accepted analytics cookies in CookieBanner. */
export function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const apply = () => {
      const accepted = hasAnalyticsConsent();
      // gtag.js can't be unloaded — a change of mind flips analytics_storage
      if (window.gtag) {
        window.gtag("consent", "update", { analytics_storage: accepted ? "granted" : "denied" });
      } else if (accepted) {
        initGtag();
      }
      if (!accepted) clearGaCookies();
      setConsented(accepted);
    };
    apply();
    window.addEventListener(CONSENT_CHANGE_EVENT, apply);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, apply);
  }, []);

  if (!consented) return null;
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  );
}
