// Google Merchant Center push: price + availability of each variant go to a
// supplemental API data source that overrides the daily-fetched feed
// (/product-feed.xml), so admin price changes reach Google within minutes
// instead of up to a day later. No-op unless the env vars are set.
//   GOOGLE_SERVICE_ACCOUNT_KEY   base64 of the service-account JSON key
//   MERCHANT_ACCOUNT_ID          e.g. 5837849185
//   MERCHANT_SUPPLEMENTAL_SOURCE data source id of the supplemental API source
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { googlePrices } from "@/lib/omnibus";
import { prisma } from "@/lib/prisma";

type ServiceAccount = { client_email: string; private_key: string; token_uri: string };

const SCOPE = "https://www.googleapis.com/auth/content";
let cachedToken: { value: string; expiresAt: number } | null = null;

function config() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const account = process.env.MERCHANT_ACCOUNT_ID;
  const source = process.env.MERCHANT_SUPPLEMENTAL_SOURCE;
  if (!key || !account || !source) return null;
  return {
    sa: JSON.parse(Buffer.from(key, "base64").toString("utf8")) as ServiceAccount,
    account,
    dataSource: `accounts/${account}/dataSources/${source}`,
  };
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(unsigned), sa.private_key)
    .toString("base64url");
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${signature}`,
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error(`Merchant token error: ${res.status}`);
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return body.access_token;
}

export type MerchantOffer = {
  variantId: string;
  /** Regular price; the struck 30-day low during a reduction (lib/omnibus googlePrices) */
  pricePln: number;
  salePricePln?: number | null;
  inStock: boolean;
};

const micros = (pln: number) => ({ amountMicros: String(pln * 10_000), currencyCode: "PLN" });
// A sale window in the past: overrides a sale_price still in the daily feed after a reduction ends
const NO_SALE = {
  startTime: "2000-01-01T00:00:00Z",
  endTime: "2000-01-02T00:00:00Z",
};

export type PushResult = { pushed: number; notInFeed: number; failed: number };

/** Upserts price + availability for the given variants (offerId = variant id, as in the feed). */
export async function pushOffersToMerchant(offers: MerchantOffer[]): Promise<PushResult> {
  const cfg = config();
  if (!cfg || offers.length === 0) return { pushed: 0, notInFeed: 0, failed: 0 };
  const token = await accessToken(cfg.sa);
  const url = `https://merchantapi.googleapis.com/products/v1/accounts/${cfg.account}/productInputs:insert?dataSource=${encodeURIComponent(cfg.dataSource)}`;
  let failed = 0;
  let notInFeed = 0;
  // Batches in parallel: a full resync is ~1.5k variants (~1.5 min)
  for (let i = 0; i < offers.length; i += 25) {
    const results = await Promise.allSettled(
      offers.slice(i, i + 25).map(async (offer) => {
        const res = await fetch(url, {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({
            offerId: offer.variantId,
            contentLanguage: "pl",
            feedLabel: "PL",
            productAttributes: {
              price: micros(offer.pricePln),
              ...(offer.salePricePln
                ? { salePrice: micros(offer.salePricePln) }
                : { salePriceEffectiveDate: NO_SALE }),
              availability: offer.inStock ? "IN_STOCK" : "OUT_OF_STOCK",
            },
          }),
        });
        // 404: not in the feed (e.g. no photo yet) — nothing to update
        if (res.status === 404) notInFeed++;
        else if (!res.ok) throw new Error(`${offer.variantId}: ${res.status} ${await res.text()}`);
      }),
    );
    for (const r of results) {
      if (r.status === "rejected") {
        failed++;
        console.error("Merchant push failed", r.reason);
      }
    }
  }
  return { pushed: offers.length - failed - notInFeed, notInFeed, failed };
}

/** Offers for these products, computed the same way as /product-feed.xml. */
async function offersFor(where: Prisma.ProductWhereInput): Promise<MerchantOffer[]> {
  // Read uncached: runs right after the admin flips the pause
  const settings = await prisma.shopSettings.findUnique({
    where: { id: 1 },
    select: { ordersPaused: true },
  });
  const ordersPaused = settings?.ordersPaused ?? false;
  const products = await prisma.product.findMany({
    // Opted-out products aren't in the feed — nothing to update
    where: { ...where, isInGoogleFeed: true },
    select: {
      status: true,
      variants: {
        select: {
          id: true,
          pricePln: true,
          comparePricePln: true,
          lowestPrice30dPln: true,
          stock: true,
          trackStock: true,
          isActive: true,
        },
      },
    },
  });
  return products.flatMap((product) =>
    product.variants.map((v) => ({
      variantId: v.id,
      ...googlePrices(v),
      // Archived/draft products and inactive variants leave the feed on the next
      // fetch; until then they must not show as buyable
      inStock:
        !ordersPaused &&
        product.status === "ACTIVE" &&
        v.isActive &&
        (!v.trackStock || v.stock > 0),
    })),
  );
}

export async function syncProductsToMerchant(productIds: string[]): Promise<void> {
  if (!config() || productIds.length === 0) return;
  await pushOffersToMerchant(await offersFor({ id: { in: productIds } }));
}

/** Daily resync — also covers price changes made outside the admin (imports, scripts). */
export async function syncAllToMerchant(): Promise<PushResult & { total: number }> {
  const offers = await offersFor({ status: "ACTIVE" });
  return { ...(await pushOffersToMerchant(offers)), total: offers.length };
}
