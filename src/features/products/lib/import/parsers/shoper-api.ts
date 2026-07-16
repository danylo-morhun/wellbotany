import { shoperRequest } from "@/lib/shoper/client";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

type ShoperPagedResponse<T> =
  | {
      list: T[];
      pages?: number | string;
      page?: number | string;
      count?: number | string;
    }
  | T[];

export type ShoperProductStock = {
  product_id?: number | string;
  stock_id?: number | string;
  id?: number | string;
  code?: string; // SKU
  ean?: string;
  name?: string;
  price?: number | string; // brutto (PLN)
  price_special?: number | string;
  stock?: number | string;
  active?: boolean | number | string;
  default?: boolean | number | string;
};

export type ShoperProduct = {
  product_id?: number | string;
  id?: number | string;
  code?: string;
  producer?: string;
  producer_id?: number | string;
  name?: string;
  translations?: Record<string, { name?: string }>;
  main_image?: { url?: string; gfx_id?: string | number; name?: string } | string;
  category_id?: number | string;
  // GET /products/{id} nests the stock row inline — lets us refresh a
  // known product's price/stock with a single request.
  stock?: ShoperProductStock;
};

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function envStr(name: string, fallback: string): string {
  return (process.env[name] ?? fallback).trim();
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "y"].includes(normalized)) return true;
    if (["0", "false", "no", "n"].includes(normalized)) return false;
  }
  return null;
}

function pickPlName(p: ShoperProduct): string | undefined {
  const t = p.translations ?? {};
  return p.name ?? t.pl_PL?.name ?? t.pl?.name ?? Object.values(t)[0]?.name;
}

function productId(p: ShoperProduct): number | null {
  return toInt(p.product_id ?? p.id);
}

function stockExternalKey(s: ShoperProductStock): string {
  const id = toInt(s.stock_id ?? s.id);
  if (id !== null) return String(id);
  if (s.code) return s.code;
  const product = toInt(s.product_id);
  if (product !== null) return `product-${product}`;
  return `stock-${crypto.randomUUID()}`;
}

async function listAllPages<T>(
  path: string,
  opts: { limit: number; maxPages: number; query?: Record<string, string | number | boolean> } = {
    limit: 50,
    maxPages: 100,
  },
): Promise<T[]> {
  const out: T[] = [];
  const limit = opts.limit;
  const maxPages = opts.maxPages;

  for (let page = 1; page <= maxPages; page++) {
    console.log(`[shoper] GET ${path} page ${page}/${maxPages}…`);
    const started = Date.now();
    const res = await shoperRequest<ShoperPagedResponse<T>>(path, {
      method: "GET",
      query: { ...(opts.query ?? {}), limit, page },
    });

    const list = Array.isArray(res) ? res : res.list;
    out.push(...list);
    console.log(
      `[shoper] page ${page} → ${list.length} rows in ${Date.now() - started}ms (total ${out.length})`,
    );

    if (Array.isArray(res)) {
      if (list.length < limit) break;
    } else {
      const pages = toInt(res.pages);
      if (pages && page >= pages) break;
      if (list.length < limit) break;
    }
  }

  return out;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const current = next++;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/**
 * Fetches products by id via GET /products/{id}, one request per id
 * (bounded concurrency). Shoper's `?filters={product_id:[...]}` on the
 * list endpoint is silently ignored on at least some shop installs — it
 * returns the full unfiltered catalog instead of erroring — so batching
 * through the list endpoint is not a safe way to look up specific ids.
 */
export async function fetchProductsByIds(ids: number[]): Promise<Map<number, ShoperProduct>> {
  const concurrency = envInt("SHOPER_PRODUCT_FETCH_CONCURRENCY", 10);
  const map = new Map<number, ShoperProduct>();
  let done = 0;

  console.log(`[shoper] fetching ${ids.length} products, concurrency ${concurrency}…`);
  const products = await mapWithConcurrency(ids, concurrency, async (id) => {
    try {
      const p = await shoperRequest<ShoperProduct>(`/products/${id}`, { method: "GET" });
      done += 1;
      if (done % 50 === 0 || done === ids.length) {
        console.log(`[shoper] fetched product ${done}/${ids.length}`);
      }
      return p;
    } catch (e) {
      done += 1;
      console.log(`[shoper] product ${id} failed:`, e instanceof Error ? e.message : e);
      return null;
    }
  });

  for (const p of products) {
    if (!p) continue;
    const pid = productId(p);
    if (pid) map.set(pid, p);
  }
  return map;
}

function brandFromProduct(
  p: ShoperProduct,
  fallback: { name: string; slug: string },
): {
  name: string;
  slug?: string;
} {
  const raw = (p.producer ?? "").trim();
  if (!raw) return { name: fallback.name, slug: fallback.slug };
  return { name: raw };
}

function shopPublicBaseUrl(): string | undefined {
  const apiBase = envStr("SHOPER_API_BASE_URL", "");
  const base = apiBase.replace(/\/webapi\/rest\/?$/, "").replace(/\/+$/, "");
  return base || undefined;
}

/**
 * Shoper's product API returns main_image as `{ gfx_id, name, ... }` with no
 * direct URL — the storefront resolves it through an on-demand image cache
 * at `/environment/cache/images/productGfx_{gfx_id}_{w}_{h}/{name}`, which
 * generates the requested size on first hit (verified against the live shop).
 */
function imageUrlFromProduct(p: ShoperProduct): string | undefined {
  const img = p.main_image;
  if (!img) return undefined;
  if (typeof img === "string") return img;
  if (img.url) return img.url;
  if (img.gfx_id) {
    const base = shopPublicBaseUrl();
    if (!base) return undefined;
    const size = envStr("SHOPER_IMAGE_SIZE", "1000_1000");
    const name = img.name ?? `${img.gfx_id}.jpg`;
    return `${base}/environment/cache/images/productGfx_${img.gfx_id}_${size}/${encodeURIComponent(name)}`;
  }
  return undefined;
}

function filterActiveStocks(
  stocks: ShoperProductStock[],
  includeInactive: boolean,
): ShoperProductStock[] {
  if (includeInactive) return stocks;
  return stocks.filter((s) => toBoolean(s.active) !== false);
}

export async function buildDraftsFromStocks(
  stocks: ShoperProductStock[],
  productsById: Map<number, ShoperProduct>,
  source: Extract<SupplierSource, { kind: "api"; format: "shoper-api" }>,
): Promise<SupplierProductDraft[]> {
  const priceField = envStr("SHOPER_PRICE_FIELD", "price"); // price | price_special

  const drafts: SupplierProductDraft[] = [];
  for (const s of stocks) {
    const pid = toInt(s.product_id);
    const p = pid ? productsById.get(pid) : undefined;

    const name = (
      s.name ??
      (p ? pickPlName(p) : undefined) ??
      s.code ??
      `Produkt ${stockExternalKey(s)}`
    )
      .toString()
      .trim();

    const pricePln =
      priceField === "price_special" ? (s.price_special ?? s.price ?? 0) : (s.price ?? 0);
    const priceGrosz = Math.max(0, Math.round(Number(pricePln) * 100));

    const stock = Math.max(0, Math.round(Number(s.stock ?? 0)));

    const brand = p
      ? brandFromProduct(p, { name: source.brandName, slug: source.brandSlug })
      : { name: source.brandName, slug: source.brandSlug };

    drafts.push({
      sourceId: source.id,
      externalKey: stockExternalKey(s),
      name,
      brandName: brand.name,
      brandSlug: brand.slug,
      sku: s.code ?? p?.code ?? undefined,
      ean: s.ean || undefined, // Shoper returns "" (not null) for products with no EAN
      externalProductId: pid ?? undefined,
      priceGrosz,
      vatRate: source.defaultVatRate,
      stock,
      imageUrl: p ? imageUrlFromProduct(p) : undefined,
    });
  }

  return drafts;
}

export async function parseShoperApi(
  source: Extract<SupplierSource, { kind: "api"; format: "shoper-api" }>,
) {
  const limit = Math.min(envInt("SHOPER_STOCKS_PAGE_LIMIT", 50), 50);
  const maxPages = envInt("SHOPER_STOCKS_MAX_PAGES", 200);
  const includeInactive = envStr("SHOPER_INCLUDE_INACTIVE", "false") === "true";

  console.log(`[shoper] parseShoperApi start: limit=${limit} maxPages=${maxPages}`);
  const stocks = await listAllPages<ShoperProductStock>("/product-stocks", { limit, maxPages });
  const filteredStocks = filterActiveStocks(stocks, includeInactive);
  console.log(`[shoper] ${stocks.length} stocks, ${filteredStocks.length} after active filter`);

  const productIds = [
    ...new Set(
      filteredStocks.map((s) => toInt(s.product_id)).filter((v): v is number => v !== null),
    ),
  ];

  const productsById = await fetchProductsByIds(productIds);

  const drafts = await buildDraftsFromStocks(filteredStocks, productsById, source);
  console.log(`[shoper] parseShoperApi done: ${drafts.length} drafts`);
  return drafts;
}

/**
 * Incremental refresh: re-fetch specific products we already imported, by
 * their Shoper product_id (stored as ProductVariant.shoperProductId at
 * import time). Uses GET /products/{id} — the list endpoint's `?filters=`
 * param is silently ignored on at least some Shoper installs (returns the
 * full unfiltered catalog instead of erroring), so it can't be trusted to
 * narrow a page down to specific ids.
 */
export async function fetchDraftsForKnownProducts(
  productIds: number[],
  source: Extract<SupplierSource, { kind: "api"; format: "shoper-api" }>,
): Promise<SupplierProductDraft[]> {
  if (productIds.length === 0) return [];

  const productsById = await fetchProductsByIds(productIds);
  const stocks = [...productsById.values()]
    .map((p) => p.stock)
    .filter((s): s is ShoperProductStock => Boolean(s));

  return buildDraftsFromStocks(stocks, productsById, source);
}

export type ShoperStocksPage = {
  stocks: ShoperProductStock[];
  page: number;
  totalPages: number;
};

/**
 * Discovery crawl: one page of the full /product-stocks listing, for a
 * resumable cursor-based cron walk across the whole catalog (see
 * ShoperSyncState + /api/cron/shoper-sync).
 */
export async function fetchStocksPage(page: number, limit = 50): Promise<ShoperStocksPage> {
  const res = await shoperRequest<ShoperPagedResponse<ShoperProductStock>>("/product-stocks", {
    method: "GET",
    query: { limit, page },
  });

  const stocks = Array.isArray(res) ? res : res.list;
  const totalPages = Array.isArray(res)
    ? page + (stocks.length < limit ? 0 : 1)
    : (toInt(res.pages) ?? page);

  return { stocks, page, totalPages };
}
