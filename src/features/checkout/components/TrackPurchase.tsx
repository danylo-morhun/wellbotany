"use client";

import { useEffect } from "react";
import {
  type AnalyticsItem,
  canTrackAdsConversion,
  trackAdsPurchase,
  trackPurchase,
} from "@/lib/analytics";
import { hasAnalyticsConsent } from "@/lib/consent";

const GA_SENT_KEY = "ga-purchases-sent";
const ADS_SENT_KEY = "ads-purchases-sent";

type Props = {
  orderNumber: string;
  totalPln: number;
  shippingPln: number;
  coupon: string | null;
  items: AnalyticsItem[];
  // Normalized + SHA-256 on the server, for Google Ads enhanced conversions
  sha256Email: string;
  sha256Phone: string | null;
};

/** Runs `send` once per order and storage key, even if the confirmation page is reloaded. */
function once(key: string, orderNumber: string, send: () => void) {
  let sent: string[] = [];
  try {
    sent = JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {}
  if (sent.includes(orderNumber)) return;
  send();
  try {
    localStorage.setItem(key, JSON.stringify([...sent, orderNumber].slice(-20)));
  } catch {}
}

/** GA4 purchase (analytics consent) and Google Ads conversion (marketing consent). */
export function TrackPurchase({
  orderNumber,
  totalPln,
  shippingPln,
  coupon,
  items,
  sha256Email,
  sha256Phone,
}: Props) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per order number
  useEffect(() => {
    // Nothing sent without consent, so nothing marked as sent
    if (hasAnalyticsConsent()) {
      once(GA_SENT_KEY, orderNumber, () =>
        trackPurchase({
          transactionId: orderNumber,
          valuePln: totalPln,
          shippingPln,
          coupon,
          items,
        }),
      );
    }
    if (canTrackAdsConversion()) {
      once(ADS_SENT_KEY, orderNumber, () =>
        trackAdsPurchase({
          transactionId: orderNumber,
          valuePln: totalPln,
          sha256Email,
          sha256Phone,
        }),
      );
    }
  }, [orderNumber]);
  return null;
}
