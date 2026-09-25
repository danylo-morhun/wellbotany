"use client";

import { useEffect } from "react";
import { type AnalyticsItem, hasAnalyticsConsent, trackPurchase } from "@/lib/analytics";

const SENT_KEY = "ga-purchases-sent";

type Props = {
  orderNumber: string;
  totalPln: number;
  shippingPln: number;
  coupon: string | null;
  items: AnalyticsItem[];
};

/** GA4 purchase, once per order even if the confirmation page is reloaded. */
export function TrackPurchase({ orderNumber, totalPln, shippingPln, coupon, items }: Props) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per order number
  useEffect(() => {
    if (!hasAnalyticsConsent()) return; // nothing sent, so nothing marked as sent
    let sent: string[] = [];
    try {
      sent = JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]");
    } catch {}
    if (sent.includes(orderNumber)) return;
    trackPurchase({ transactionId: orderNumber, valuePln: totalPln, shippingPln, coupon, items });
    try {
      localStorage.setItem(SENT_KEY, JSON.stringify([...sent, orderNumber].slice(-20)));
    } catch {}
  }, [orderNumber]);
  return null;
}
