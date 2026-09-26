// Step 1 of the EAN pass: collect barcodes from sources — manufacturer shops
// and supplier price lists — into data/content-pass/ean/sources.json. No DB
// access; ean-candidates.ts matches these records to variants.
//
//   npx tsx scripts/content-pass/ean-crawl.ts [--only yango,drjacobs,healthlabs,singularis,kenay]
//
// Every record keeps the page URL / file it came from and the product name
// and pack size shown there, so a reviewer can check the match.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

export type SourceRecord = {
  source: "yango" | "drjacobs" | "healthlabs" | "singularis" | "kenay";
  /** Key the matcher joins on: yango product id, Dr. Jacob's shop id, HealthLabs uid, URL, … */
  key: string;
  url: string;
  name: string;
  size?: string;
  ean: string;
};

const OUT_DIR = "data/content-pass/ean";
const OUT = `${OUT_DIR}/sources.json`;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/130 Safari/537.36";

const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(",") : null;

async function get(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
      if (res.status === 404) return null;
      if (res.ok) return await res.text();
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return null;
}

/** Polite parallel map: a few requests at a time. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
        if (++done % 50 === 0) console.log(`  ${done}/${items.length}`);
        await new Promise((r) => setTimeout(r, 250));
      }
    }),
  );
  return out;
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function jsonLdProducts(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      const nodes = Array.isArray(data) ? data : (data["@graph"] ?? [data]);
      for (const n of nodes) if (n?.["@type"] === "Product") out.push(n);
    } catch {}
  }
  return out;
}

// Yango: B2B price list rows carry the PrestaShop product id of yango.pl
async function yango(): Promise<SourceRecord[]> {
  const lines = readFileSync("product_2026-06-30_092037.csv", "utf8").split("\n").slice(1);
  const ids = [...new Set(lines.map((l) => l.split(";")[0]).filter((id) => /^\d+$/.test(id)))];
  console.log(`yango: ${ids.length} products`);
  const records = await pool(ids, 4, async (id) => {
    const url = `https://yango.pl/index.php?controller=product&id_product=${id}`;
    const html = await get(url);
    if (!html) return null;
    const ean =
      /<dt>EAN13<\/dt>\s*<dd>(\d+)<\/dd>/.exec(html)?.[1] ?? /"gtin13":\s*"(\d+)"/.exec(html)?.[1];
    const name = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1].replace(/<[^>]+>/g, "");
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? url;
    return ean && name
      ? { source: "yango", key: id, url: canonical, name: decode(name), ean }
      : null;
  });
  return records.filter((r): r is SourceRecord => r !== null);
}

// Dr. Jacob's: our SKUs are DRJACOBS-<Shoper product id>
async function drjacobs(ids: string[]): Promise<SourceRecord[]> {
  console.log(`drjacobs: ${ids.length} products`);
  const records = await pool(ids, 3, async (id) => {
    const url = `https://sklep.drjacobs.pl/pl/p/x/${id}`;
    const html = await get(url);
    if (!html) return null;
    const ean = /itemprop="gtin" content="(\d+)"/.exec(html)?.[1];
    const name = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1].replace(/<[^>]+>/g, "");
    const size = /Pojemność[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)/.exec(html)?.[1];
    return ean && name
      ? { source: "drjacobs", key: id, url, name: decode(name), size: size && decode(size), ean }
      : null;
  });
  return records.filter((r): r is SourceRecord => r !== null);
}

// HealthLabs: the Nuxt payload of any product page lists the whole catalog
async function healthlabs(): Promise<SourceRecord[]> {
  const html = await get("https://www.healthlabs.care/pl/produkt/mio-inozytol-forte");
  const raw = html && /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (!raw) throw new Error("healthlabs: no __NUXT_DATA__");
  const payload = JSON.parse(raw) as unknown[];
  const at = (i: unknown) => (typeof i === "number" ? payload[i] : i);
  const records: SourceRecord[] = [];
  for (const node of payload) {
    if (!node || typeof node !== "object" || Array.isArray(node) || !("ean" in node)) continue;
    const o = node as Record<string, unknown>;
    const ean = at(o.ean);
    const uid = at(o.uid);
    if (typeof ean !== "string" || !/^\d{8,14}$/.test(ean) || typeof uid !== "string") continue;
    records.push({
      source: "healthlabs",
      key: uid,
      url: `https://www.healthlabs.care/pl/produkt/${uid}`,
      name: String(at(o.name)),
      size: typeof at(o.size) === "string" ? String(at(o.size)) : undefined,
      ean,
    });
  }
  console.log(`healthlabs: ${records.length} products`);
  return records;
}

// Singularis: WooCommerce, gtin in JSON-LD
async function singularis(): Promise<SourceRecord[]> {
  const index = (await get("https://singularis.com.pl/sitemap_index.xml")) ?? "";
  const maps = [...index.matchAll(/<loc>([^<]*product-sitemap[0-9]*\.xml)<\/loc>/g)].map(
    (m) => m[1],
  );
  const urls: string[] = [];
  for (const map of maps) {
    const xml = (await get(map)) ?? "";
    urls.push(
      ...[...xml.matchAll(/<loc>(https:\/\/singularis\.com\.pl\/sklep\/[^<]+)<\/loc>/g)].map(
        (m) => m[1],
      ),
    );
  }
  console.log(`singularis: ${urls.length} product pages`);
  const records = await pool(urls, 4, async (url) => {
    const html = await get(url);
    const product = html ? jsonLdProducts(html)[0] : undefined;
    const ean = product && String(product.gtin ?? product.gtin13 ?? "");
    return product && ean && /^\d{8,14}$/.test(ean)
      ? { source: "singularis" as const, key: url, url, name: decode(String(product.name)), ean }
      : null;
  });
  return records.filter((r): r is SourceRecord => r !== null);
}

// Kenay: price list with an EAN column (same file the catalog was imported from)
function kenay(): SourceRecord[] {
  const file = "Cennik KENAY 2026+pack..xlsx";
  const sheet = XLSX.read(readFileSync(file)).Sheets.Arkusz1;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const records: SourceRecord[] = [];
  for (const row of rows) {
    const ean = String(row[8]).replace(/\D/g, "");
    const name = String(row[1]).trim();
    if (!/^\d{8,14}$/.test(ean) || !name) continue;
    records.push({
      source: "kenay",
      key: ean,
      url: `file:${file}#L.P.${row[0]}`,
      name: decode(name),
      size: String(row[2]).trim() || undefined,
      ean,
    });
  }
  console.log(`kenay: ${records.length} rows`);
  return records;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const previous: SourceRecord[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
  const want = (s: string) => !only || only.includes(s);
  const fresh: SourceRecord[] = [];
  if (want("kenay")) fresh.push(...kenay());
  if (want("healthlabs")) fresh.push(...(await healthlabs()));
  if (want("drjacobs")) {
    const ids = JSON.parse(readFileSync(`${OUT_DIR}/drjacobs-ids.json`, "utf8")) as string[];
    fresh.push(...(await drjacobs(ids)));
  }
  if (want("yango")) fresh.push(...(await yango()));
  if (want("singularis")) fresh.push(...(await singularis()));
  const refreshed = new Set(fresh.map((r) => r.source));
  const all = [...previous.filter((r) => !refreshed.has(r.source)), ...fresh];
  writeFileSync(OUT, JSON.stringify(all, null, 1));
  console.log(`${all.length} records → ${OUT}`);
}

main();
