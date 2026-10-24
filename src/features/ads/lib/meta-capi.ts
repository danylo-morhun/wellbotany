import { META_ENABLED } from "@/lib/marketing-config";
import { hashedContact } from "./user-data";

// Meta Conversions API, server-side only — no Meta Pixel runs in the browser.
// Meta's Business Tools Terms (1.h) forbid sending health information, and
// with our "na prostatę" / "na płodność" catalogue the products bought, page
// URLs and category names could reveal it (TSUE C-21/23 Lindenapotheke). So
// the event carries the order value only: no content_ids, names or paths.

const GRAPH_VERSION = "v24.0";

export function isMetaCapiEnabled() {
  // META_ENABLED too: the banner and policies mention Meta only when it's set
  return META_ENABLED && Boolean(process.env.META_DATASET_ID && process.env.META_CAPI_TOKEN);
}

export type MetaPurchase = {
  orderNumber: string;
  totalPln: number; // grosz
  numItems: number;
  email: string;
  phone: string | null;
  fbc?: string;
  clientIp: string;
  userAgent: string | null;
  appUrl: string;
};

export function buildPurchaseEvent(order: MetaPurchase, now = new Date()) {
  const contact = hashedContact(order.email, order.phone);
  return {
    event_name: "Purchase",
    event_time: Math.floor(now.getTime() / 1000),
    // Same id a browser event would use, so Meta deduplicates if a pixel is ever added
    event_id: order.orderNumber,
    action_source: "website",
    // Domain only — the path could name a health category
    event_source_url: new URL("/", order.appUrl).toString(),
    user_data: {
      em: [contact.email],
      ...(contact.phoneMeta && { ph: [contact.phoneMeta] }),
      ...(order.fbc && { fbc: order.fbc }),
      ...(order.clientIp !== "unknown" && { client_ip_address: order.clientIp }),
      ...(order.userAgent && { client_user_agent: order.userAgent }),
    },
    custom_data: {
      currency: "PLN",
      value: order.totalPln / 100,
      num_items: order.numItems,
    },
  };
}

/** Sends the Purchase event. Call only for orders placed with marketing consent. */
export async function sendMetaPurchase(order: MetaPurchase) {
  if (!isMetaCapiEnabled()) return;
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.META_DATASET_ID}/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [buildPurchaseEvent(order)],
      access_token: process.env.META_CAPI_TOKEN,
      ...(process.env.META_TEST_EVENT_CODE && {
        test_event_code: process.env.META_TEST_EVENT_CODE,
      }),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Meta CAPI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}
