// GA4 helpers (client-only). Nothing is sent unless the visitor accepted
// analytics cookies — GoogleAnalytics only loads gtag.js after consent, and
// track() drops events without it.

export const CONSENT_STORAGE_KEY = "cookie-consent";
export const CONSENT_CHANGE_EVENT = "cookie-consent:change";
export const OPEN_COOKIE_SETTINGS_EVENT = "cookie-consent:open";

export type ConsentChoice = "accepted" | "rejected";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function readConsent(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Private mode — the choice lasts for this page view only
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: choice }));
}

/** Removes GA cookies (_ga, _ga_*) after consent is refused or withdrawn. */
export function clearGaCookies() {
  const host = window.location.hostname;
  // GA sets them on the top-level domain (".wellbotany.pl"), so try each level
  const domains = host.split(".").map((_, i, parts) => parts.slice(i).join("."));
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!name.startsWith("_ga")) continue;
    for (const domain of ["", ...domains.map((d) => `; domain=.${d}`)])
      document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
  }
}

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

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Defines window.gtag (queueing into dataLayer until gtag.js loads) and sends
 * the config hit. Runs from our bundle, not an inline <script>: on strict-CSP
 * pages inline code would need the request nonce.
 */
export function initGtag() {
  if (!GA_ID || window.gtag) return;
  const w = window as unknown as { dataLayer: unknown[] };
  w.dataLayer = w.dataLayer || [];
  window.gtag = function gtag() {
    // biome-ignore lint/complexity/noArguments: gtag.js reads the Arguments object
    w.dataLayer.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
}

/** Queued even before gtag.js has loaded; dropped without consent. */
export function hasAnalyticsConsent() {
  return Boolean(GA_ID) && readConsent() === "accepted";
}

function track(event: string, params: Record<string, unknown>) {
  if (!hasAnalyticsConsent()) return;
  initGtag();
  window.gtag?.("event", event, params);
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
