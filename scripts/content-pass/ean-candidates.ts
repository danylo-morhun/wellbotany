// Step 2 of the EAN pass: match source barcodes to variants without an EAN,
// verify each candidate and write a review CSV. Nothing is written to the DB.
//
//   DATABASE_URL=<dev> npx tsx scripts/content-pass/ean-candidates.ts [--prod]
//
// Sources (never generated): ean-crawl.ts records (manufacturer shops, Kenay
// price list), EANs quoted from manufacturer pages in the content pass, and
// SKUs that suppliers filled with the barcode. Checks per candidate:
// GTIN check digit, not used by another variant, GS1 company prefix seen
// before for the brand, pack size on the source equal to the variant's.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { slugify } from "../../src/lib/slugify";
import {
  type PackQuantity,
  parsePackQuantity,
  variantPackQuantity,
} from "../../src/lib/unit-price";
import { connect } from "./db";
import type { SourceRecord } from "./ean-crawl";
import { isValidGtin } from "./lib/gtin";

const SITE = "https://wellbotany.pl";
const OUT = "docs/ean-review.csv";
// Manual review of "sprawdź" rows: "<variantId>:<EAN>" → { zastosuj: "tak" | "nie", powód }
const DECISIONS = "data/content-pass/ean/review-decisions.json";
const BATCHES = "data/content-pass/batches";

type Candidate = {
  ean: string;
  source: string;
  url: string;
  sourceName: string;
  sourceSize?: string;
  /** Joined on an id/SKU rather than a name — the GS1 prefix check is then informational */
  strong?: boolean;
};

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const norm = (s: string) => s.toLowerCase().replace(/[™®©]/g, "").replace(/\s+/g, " ").trim();

/**
 * Pack quantity mentioned in a source title/size: "(120 kapsułek)", "… 60 kaps.", "30szt".
 * Thousands grouping ("2 400 tabl.") only in size fields — in titles "Q7 300 kaps."
 * or "trymestr 2 i 3 150 kapsułek" would glue digits together.
 */
function quantityIn(text: string | undefined, isSizeField = false): PackQuantity | null {
  if (!text) return null;
  const units =
    "(kaps(?:ułek|ułki|\\.)?|tabl(?:etek|etki|\\.)?|sasz(?:etek|etki|\\.)?|szt\\.?|żel(?:ek|ków|ki)|g|kg|ml|l)(?![a-ząćęłńóśźż])";
  const number = isSizeField
    ? "(\\d{1,3}(?:[ \\u00a0]\\d{3})+|\\d+(?:[.,]\\d+)?)"
    : "(?<![\\d])(\\d+(?:[.,]\\d+)?)";
  const re = new RegExp(`${number}\\s*${units}`, "gi");
  const found = [...text.matchAll(re)].map((m) => parsePackQuantity(`${m[1]} ${m[2]}`));
  const counts = found.filter((q) => q?.unit === "ct");
  return counts[0] ?? found[0] ?? null;
}

/** Size field first, the title as a fallback. */
const candidateQuantity = (c: Candidate) =>
  quantityIn(c.sourceSize, true) ?? quantityIn(c.sourceName);

function samePack(a: PackQuantity | null, b: PackQuantity | null): boolean | null {
  if (!a || !b) return null;
  if (a.unit !== b.unit) return null; // count vs mass: not comparable
  return Math.abs(a.value - b.value) < 0.01;
}

/** Name without pack size / brand noise, to find the same product in another pack. */
const baseName = (name: string) =>
  norm(name)
    .replace(
      /\b\d+(?:[.,]\d+)?\s*(kaps(?:ułek|ułki|\.)?|tabl(?:etek|etki|\.)?|sasz(?:etek|etki|\.)?|szt\.?|g|ml|x)(?![a-ząćęłńóśźż])/g,
      "",
    )
    .replace(/\b(x|singularis|superior|wegański|wegańskich|wegańskie)\b/g, "")
    .replace(/[^a-ząćęłńóśźż0-9]+/g, " ")
    .trim();

// Dose units and fillers say nothing about which product it is
const NOISE = new Set([
  "i",
  "z",
  "w",
  "na",
  "do",
  "dla",
  "mg",
  "µg",
  "mcg",
  "iu",
  "ml",
  "g",
  "kaps",
  "szt",
]);
const tokens = (s: string) =>
  new Set(
    norm(s)
      .split(/[^a-ząćęłńóśźżµ0-9]+/)
      .filter((w) => w && !NOISE.has(w)),
  );

/** Jaccard similarity of two token sets. */
function similarity(a: Set<string>, b: Set<string>): number {
  const common = [...a].filter((w) => b.has(w)).length;
  return common / (a.size + b.size - common || 1);
}

/**
 * From the content pass: EANs quoted from manufacturer/distributor pages, and
 * the manufacturer page URLs judged to be exactly this product.
 */
function contentPass(): { facts: Map<string, Candidate[]>; urls: Map<string, string[]> } {
  const byProduct = new Map<string, Candidate[]>();
  const urls = new Map<string, string[]>();
  if (!existsSync(BATCHES)) return { facts: byProduct, urls };
  for (const brand of readdirSync(BATCHES)) {
    for (const file of readdirSync(`${BATCHES}/${brand}`)) {
      if (!file.endsWith(".sources.json")) continue;
      const base = file.replace(/\.sources\.json$/, "");
      const inputFile = `${BATCHES}/${brand}/${base}.input.json`;
      if (!existsSync(inputFile)) continue;
      const input = JSON.parse(readFileSync(inputFile, "utf8")) as { products: { id: string }[] };
      const sources = JSON.parse(readFileSync(`${BATCHES}/${brand}/${file}`, "utf8")) as {
        sources: {
          url: string;
          productMatch: string;
          facts: { field: string; quote: string }[];
        }[];
      };
      for (const s of sources.sources ?? []) {
        if (s.productMatch !== "exact" || !s.url) continue;
        for (const p of input.products) urls.set(p.id, [...(urls.get(p.id) ?? []), s.url]);
        const form = s.facts.find((f) => f.field === "form")?.quote;
        for (const f of s.facts) {
          if (f.field !== "ean") continue;
          for (const ean of f.quote.match(/\b\d{8,14}\b/g) ?? []) {
            for (const p of input.products) {
              const list = byProduct.get(p.id) ?? [];
              list.push({
                ean,
                source: "content-pass",
                url: s.url,
                sourceName: f.quote,
                sourceSize: form,
              });
              byProduct.set(p.id, list);
            }
          }
        }
      }
    }
  }
  return { facts: byProduct, urls };
}

async function main() {
  const prisma = connect();
  const sources: SourceRecord[] = JSON.parse(
    readFileSync("data/content-pass/ean/sources.json", "utf8"),
  );
  const bySourceKey = new Map(sources.map((r) => [`${r.source}:${r.key}`, r]));
  const { facts, urls: pageUrls } = contentPass();
  const decisions: Record<string, { zastosuj: string; powód: string }> = existsSync(DECISIONS)
    ? JSON.parse(readFileSync(DECISIONS, "utf8"))
    : {};

  // Yango price list: our SKU is its "Indeks" or "YANGO-<name>"; both lead to the shop product id
  const yangoId = new Map<string, string>();
  for (const line of readFileSync("product_2026-06-30_092037.csv", "utf8").split("\n").slice(1)) {
    const cells = line.split(";").map((c) => c.replace(/^"|"$/g, "").trim());
    if (!/^\d+$/.test(cells[0] ?? "")) continue;
    yangoId.set(`YANGO-${cells[2]}`, cells[0]);
    if (cells[3]) yangoId.set(cells[3], cells[0]);
  }

  const variants = await prisma.productVariant.findMany({
    select: {
      id: true,
      sku: true,
      ean: true,
      isActive: true,
      optionValue: true,
      product: {
        select: {
          id: true,
          slug: true,
          namePl: true,
          netWeight: true,
          status: true,
          brand: { select: { name: true } },
          _count: { select: { variants: { where: { isActive: true } } } },
        },
      },
    },
  });
  const usedBy = new Map(variants.filter((v) => v.ean).map((v) => [v.ean as string, v.id]));
  // GS1 company prefixes (first 7 digits) already used by each brand
  const brandPrefixes = new Map<string, Set<string>>();
  for (const v of variants) {
    if (!v.ean || !v.product.brand) continue;
    const set = brandPrefixes.get(v.product.brand.name) ?? new Set();
    set.add(v.ean.slice(0, 7));
    brandPrefixes.set(v.product.brand.name, set);
  }
  const hlBySlug = new Map<string, SourceRecord[]>();
  for (const r of sources.filter((s) => s.source === "healthlabs")) {
    for (const key of [r.key, slugify(r.name.replace(/\(.*?\)/g, ""))]) {
      const list = hlBySlug.get(key) ?? [];
      list.push(r);
      hlBySlug.set(key, list);
    }
  }
  const singularis = sources.filter((s) => s.source === "singularis");
  const singularisByBase = new Map<string, SourceRecord[]>();
  for (const r of singularis) {
    const key = baseName(r.name);
    singularisByBase.set(key, [...(singularisByBase.get(key) ?? []), r]);
  }

  const targets = variants.filter((v) => !v.ean && v.isActive && v.product.status === "ACTIVE");
  const rows: { variant: (typeof targets)[number]; cand: Candidate[]; qty: PackQuantity | null }[] =
    [];
  for (const v of targets) {
    const cand: Candidate[] = [];
    const fromRecord = (r: SourceRecord | undefined, label: string, strong = true) => {
      if (r)
        cand.push({
          ean: r.ean,
          source: label,
          url: r.url,
          sourceName: r.name,
          sourceSize: r.size,
          strong,
        });
    };
    const qty = variantPackQuantity(
      v.optionValue,
      v.product.netWeight,
      v.product._count.variants === 1,
      v.product.namePl,
    );
    const sku = v.sku;
    if (isValidGtin(sku)) {
      const kenay = bySourceKey.get(`kenay:${sku}`);
      if (kenay) fromRecord(kenay, "cennik Kenay (= SKU)");
      else
        cand.push({
          ean: sku,
          source: "SKU z importu dostawcy",
          url: "",
          sourceName: sku,
          strong: true,
        });
    }
    const yid = yangoId.get(sku);
    if (yid) fromRecord(bySourceKey.get(`yango:${yid}`), "yango.pl (id z cennika B2B)");
    const dj = /^DRJACOBS-(\d+)$/.exec(sku)?.[1];
    if (dj) fromRecord(bySourceKey.get(`drjacobs:${dj}`), "sklep.drjacobs.pl (id z SKU)");
    const hl = /^HLC-(.+)$/.exec(sku)?.[1];
    const isSet = /zestaw/i.test(v.product.namePl);
    if (hl)
      // Their "(zestaw 2-miesięczny)" multipacks share the base name
      for (const r of hlBySlug.get(hl) ?? [])
        if (/zestaw/i.test(r.name) === isSet) fromRecord(r, "healthlabs.care");
    if (hl && cand.length === 0) {
      // SKU slugs came from the owner's file names, not their uids: best token overlap
      // with our SKU + name, clearly ahead of the runner-up; weak unless near-identical
      const ours = new Set([...tokens(hl.replace(/-/g, " ")), ...tokens(v.product.namePl)]);
      const scored = sources
        .filter((r) => r.source === "healthlabs" && /zestaw/i.test(r.name) === isSet)
        .map((r) => ({
          r,
          score: similarity(
            ours,
            new Set([...tokens(r.key.replace(/-/g, " ")), ...tokens(r.name)]),
          ),
        }))
        .filter((x) => samePack(quantityIn(x.r.size, true), qty) !== false)
        .sort((a, b) => b.score - a.score);
      const [best, second] = scored;
      if (best && best.score >= 0.5 && best.score - (second?.score ?? 0) >= 0.15)
        fromRecord(best.r, `healthlabs.care (podobna nazwa, ${best.score.toFixed(2)})`, false);
    }
    for (const c of facts.get(v.product.id) ?? []) cand.push(c);
    if (v.product.brand?.name === "Singularis") {
      // The content-pass page is this product; the same name with another pack
      // count is its sibling pack. Pick the page whose pack equals the variant's.
      const pages = (pageUrls.get(v.product.id) ?? [])
        .map((u) => bySourceKey.get(`singularis:${u}`))
        .filter((r): r is SourceRecord => r !== undefined);
      const family = new Set(pages.flatMap((r) => singularisByBase.get(baseName(r.name)) ?? []));
      for (const r of family)
        if (samePack(quantityIn(r.name), qty))
          fromRecord(
            r,
            pages.includes(r)
              ? "singularis.com.pl (strona z content-pass)"
              : "singularis.com.pl (ta sama nazwa, inne opakowanie)",
          );
      if (cand.length === 0) {
        // Weak fallback: all words of our core name on the page, same pack, one page only
        const core = [...tokens(v.product.namePl.split(" – ")[0])];
        const hits = singularis.filter((r) => {
          const page = tokens(r.name);
          return (
            core.length > 0 && core.every((w) => page.has(w)) && samePack(quantityIn(r.name), qty)
          );
        });
        if (hits.length === 1) {
          const same = baseName(hits[0].name) === baseName(v.product.namePl.split(" – ")[0]);
          fromRecord(
            hits[0],
            same
              ? "singularis.com.pl (identyczna nazwa)"
              : "singularis.com.pl (dopasowanie po nazwie)",
            same,
          );
        }
      }
    }
    // Several pages for one variant: keep those whose pack does not contradict it
    const fits = cand.filter((c) => samePack(candidateQuantity(c), qty) !== false);
    rows.push({
      variant: v,
      cand: fits.length > 0 && fits.length < cand.length ? fits : cand,
      qty,
    });
  }

  // Candidate EAN → variants proposing it (to catch one barcode on two variants)
  const proposedBy = new Map<string, Set<string>>();
  for (const { variant, cand } of rows)
    for (const c of cand)
      proposedBy.set(c.ean, (proposedBy.get(c.ean) ?? new Set()).add(variant.id));

  const header = [
    "status",
    "zastosuj",
    "variantId",
    "marka",
    "produkt",
    "wariant",
    "EAN",
    "źródło",
    "nazwa w źródle",
    "opakowanie w źródle",
    "URL źródła",
    "suma kontrolna",
    "unikalny",
    "prefiks marki",
    "opakowanie zgodne",
    "admin",
    "uwagi",
  ];
  const lines = [header.map(csv).join(",")];
  const stats = { ok: 0, check: 0, conflict: 0, none: 0 };
  const missingByBrand = new Map<string, number>();
  for (const { variant: v, cand, qty } of rows) {
    const brand = v.product.brand?.name ?? "";
    const admin = `${SITE}/admin/produkty/${v.product.id}`;
    const distinct = [...new Set(cand.map((c) => c.ean))];
    if (distinct.length === 0) {
      stats.none++;
      missingByBrand.set(brand, (missingByBrand.get(brand) ?? 0) + 1);
      lines.push(
        [
          "brak źródła",
          "",
          v.id,
          brand,
          v.product.namePl,
          v.optionValue,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          admin,
          "",
        ]
          .map(csv)
          .join(","),
      );
      continue;
    }
    for (const ean of distinct) {
      const from = cand.filter((c) => c.ean === ean);
      const first = from[0];
      const checksum = isValidGtin(ean);
      const unique = !usedBy.has(ean) && (proposedBy.get(ean)?.size ?? 0) === 1;
      const prefixes = brandPrefixes.get(brand);
      // Books carry ISBN-13 (978/979) as GTIN; id-joined sources may bring a brand's other prefixes
      const prefixOk =
        /^97[89]/.test(ean) || from.some((c) => c.strong) || !prefixes || prefixes.size === 0
          ? null
          : prefixes.has(ean.slice(0, 7));
      const packOk = from
        .map((c) => samePack(candidateQuantity(c), qty))
        .reduce<boolean | null>(
          (acc, x) => (x === false || acc === false ? false : (x ?? acc)),
          null,
        );
      const status =
        distinct.length > 1
          ? "konflikt"
          : checksum &&
              unique &&
              prefixOk !== false &&
              packOk !== false &&
              from.some((c) => c.strong || c.source === "content-pass")
            ? "ok"
            : "sprawdź";
      if (status === "ok") stats.ok++;
      else if (status === "konflikt") stats.conflict++;
      else stats.check++;
      const yn = (b: boolean | null) => (b === null ? "?" : b ? "tak" : "NIE");
      lines.push(
        [
          status,
          decisions[`${v.id}:${ean}`]?.zastosuj ?? (status === "ok" ? "tak" : ""),
          v.id,
          brand,
          v.product.namePl,
          v.optionValue,
          ean,
          [...new Set(from.map((c) => c.source))].join("; "),
          first.sourceName,
          first.sourceSize,
          first.url,
          yn(checksum),
          usedBy.has(ean) ? `NIE (ma już wariant ${usedBy.get(ean)})` : yn(unique),
          yn(prefixOk),
          yn(packOk),
          admin,
          decisions[`${v.id}:${ean}`]?.powód ?? "",
        ]
          .map(csv)
          .join(","),
      );
    }
  }
  writeFileSync(OUT, `${lines.join("\n")}\n`);
  console.log(`${targets.length} variants without EAN → ${OUT}`);
  console.log(
    `ok: ${stats.ok}, sprawdź: ${stats.check}, konflikt (rows): ${stats.conflict}, brak źródła: ${stats.none}`,
  );
  console.log("brak źródła per brand:", Object.fromEntries(missingByBrand));
  await prisma.$disconnect();
}

main();
