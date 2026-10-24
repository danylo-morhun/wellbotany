// Google tag helpers (client-only): GA4 with analytics consent, Google Ads
// conversions with marketing consent. GoogleTag loads gtag.js only after one
// of them, and every send checks its own category.

import { hasAnalyticsConsent, hasMarketingConsent, readConsent } from "./consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID; // "AW-…"
const ADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;

export type AnalyticsItem = {
  itemId: string;
  itemName: string;
  itemBrand?: string | null;
  itemVariant?: string | null;
  pricePln: number; // grosz
  quantity?: number;
};

const toGaItem = (item: AnalyticsItem) => ({
  item_id: item.itemId,
  item_name: item.itemName,
  ...(item.itemBrand && { item_brand: item.itemBrand }),
  ...(item.itemVariant && { item_variant: item.itemVariant }),
  price: item.pricePln / 100,
  quantity: item.quantity ?? 1,
});

/** Which Google destinations the stored consent allows. */
export function allowedGoogleTags() {
  const consent = readConsent();
  return {
    analytics: Boolean(GA_ID) && consent?.analytics === true,
    ads: Boolean(ADS_ID) && hasMarketingConsent(),
  };
}

const configured = new Set<string>();

/**
 * Defines window.gtag (queueing into dataLayer until gtag.js loads), applies
 * Consent Mode from the stored choice and configures each allowed destination
 * once. Safe to call repeatedly. Runs from our bundle, not an inline <script>:
 * on strict-CSP pages inline code would need the request nonce.
 */
export function syncGtag() {
  const { analytics, ads } = allowedGoogleTags();
  if (!window.gtag) {
    if (!analytics && !ads) return;
    const w = window as unknown as { dataLayer: unknown[] };
    w.dataLayer = w.dataLayer || [];
    window.gtag = function gtag() {
      // biome-ignore lint/complexity/noArguments: gtag.js reads the Arguments object
      w.dataLayer.push(arguments);
    };
    // Basic consent mode: everything denied until the update below.
    // ad_personalization is never granted — we measure conversions, no remarketing
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
  }
  window.gtag("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: ads ? "granted" : "denied",
    ad_user_data: ads ? "granted" : "denied",
  });
  if (analytics && GA_ID && !configured.has(GA_ID)) {
    window.gtag("config", GA_ID);
    configured.add(GA_ID);
  }
  if (ads && ADS_ID && !configured.has(ADS_ID)) {
    window.gtag("config", ADS_ID, { allow_enhanced_conversions: true });
    configured.add(ADS_ID);
  }
}

function track(event: string, params: Record<string, unknown>) {
  if (!GA_ID || !hasAnalyticsConsent()) return;
  syncGtag();
  window.gtag?.("event", event, { ...params, send_to: GA_ID });
}

/** view_item / add_to_cart / begin_checkout — value = sum of item prices. */
export function trackItems(
  event: "view_item" | "add_to_cart" | "begin_checkout",
  items: AnalyticsItem[],
) {
  const value = items.reduce((sum, i) => sum + i.pricePln * (i.quantity ?? 1), 0) / 100;
  track(event, { currency: "PLN", value, items: items.map(toGaItem) });
}

export function trackPurchase(order: {
  transactionId: string;
  valuePln: number;
  shippingPln: number;
  coupon?: string | null;
  items: AnalyticsItem[];
}) {
  track("purchase", {
    transaction_id: order.transactionId,
    currency: "PLN",
    value: order.valuePln / 100,
    shipping: order.shippingPln / 100,
    ...(order.coupon && { coupon: order.coupon }),
    items: order.items.map(toGaItem),
  });
}

export function canTrackAdsConversion() {
  return Boolean(ADS_PURCHASE_LABEL) && allowedGoogleTags().ads;
}

/**
 * Google Ads purchase conversion with enhanced conversions. The e-mail and
 * phone arrive already normalized and SHA-256 hashed by the server — only
 * the order's own buyer sees them. No product data is sent.
 */
export function trackAdsPurchase(order: {
  transactionId: string;
  valuePln: number;
  sha256Email: string;
  sha256Phone: string | null;
}) {
  if (!canTrackAdsConversion()) return;
  syncGtag();
  window.gtag?.("set", "user_data", {
    sha256_email_address: order.sha256Email,
    ...(order.sha256Phone && { sha256_phone_number: order.sha256Phone }),
  });
  window.gtag?.("event", "conversion", {
    send_to: `${ADS_ID}/${ADS_PURCHASE_LABEL}`,
    value: order.valuePln / 100,
    currency: "PLN",
    transaction_id: order.transactionId,
  });
}
