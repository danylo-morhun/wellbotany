// Research step on the local machine, no Claude quota:
//   1. find the product page in the maker's sitemap (token match on the URL)
//   2. fetch it, reduce to text
//   3. local text model extracts facts → only quotes found VERBATIM in the
//      page or supplier rows survive (a model can't invent a surviving quote)
//   4. local vision model reads the pack size printed on each photo
// Writes KEY.sources.json in the format rules/research.md describes.
//   npx tsx scripts/content-pass/research-local.ts data/content-pass/batches/<brand> [--force]
// Items whose page can't be found get "notFound" — the Claude session looks
// those URLs up by web search and re-runs with KEY.url.txt next to the input.
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { chatJson, TEXT_MODEL, VISION_MODEL } from "./lib/ollama";

const dir = process.argv[2];
const force = process.argv.includes("--force");
if (!dir) throw new Error("Usage: research-local.ts <batch dir>");

// Maker / official distributor sites per brand (sitemaps verified 2026-09-23)
const SITEMAPS: Record<string, string[]> = {
  Yango: ["https://yango.pl/1_pl_0_sitemap.xml"],
  Mitopharma: ["https://www.mito-pharma.pl/sitemap.xml.gz"],
  "Dr. Enzmann": ["https://www.mito-pharma.pl/sitemap.xml.gz"],
  BestLab: ["https://bestlab.com.pl/1_index_sitemap.xml"],
  "HealthLabs Care": ["https://www.healthlabs.care/sitemap.xml"],
  Aliness: ["https://aliness.pl/sitemap_index.xml"],
  "OMNi-BiOTiC": ["https://sklep.omni-biotic.pl/console/integration/execute/name/GoogleSitemap"],
  Singularis: ["https://singularis.com.pl/wp-sitemap.xml"],
  // ForMeds lines and products it distributes
  BICAPS: ["https://formeds.pl/sitemap.xml"],
  POWDER: ["https://formeds.pl/sitemap.xml"],
  INAMIA: ["https://formeds.pl/sitemap.xml"],
  OLICAPS: ["https://formeds.pl/sitemap.xml"],
  LIPOCAPS: ["https://formeds.pl/sitemap.xml"],
  PRENACAPS: ["https://formeds.pl/sitemap.xml"],
  HILKI: ["https://formeds.pl/sitemap.xml"],
  "Pure Hydration": ["https://formeds.pl/sitemap.xml"],
};
const UA = { "User-Agent": "Mozilla/5.0 (Macintosh) WellBotanyContentBot/1.0" };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const tokens = (s: string) =>
  new Set(
    norm(s)
      .split(" ")
      .filter((t) => t.length > 1),
  );

async function get(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: UA, redirect: "follow" });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const sitemapCache = new Map<string, string[]>();
/** All page URLs in a sitemap, following sitemap indexes and .gz files. */
async function sitemapUrls(url: string, depth = 0): Promise<string[]> {
  if (sitemapCache.has(url)) return sitemapCache.get(url) as string[];
  let body = await get(url);
  // Real gzip starts 1f 8b — some ".xml.gz" sitemaps are plain XML
  if (body[0] === 0x1f && body[1] === 0x8b) body = (await import("node:zlib")).gunzipSync(body);
  const locs = [
    ...body
      .toString("utf8")
      .matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\s\]]+)\s*(?:\]\]>)?\s*<\/loc>/g),
  ].map((m) => m[1]);
  const nested = locs.filter(
    (l) => /sitemap/i.test(l) && /\.xml(\.gz)?$|sitemap/i.test(l.split("/").pop() ?? ""),
  );
  const pages = locs.filter((l) => !nested.includes(l));
  // Polish pages only (e.g. BestLab also lists _en_/_de_ sitemaps)
  const polish = (l: string) => !/[_/-](en|de|uk|cz|sk|lt)[_/.-]/i.test(l);
  const children =
    depth < 2
      ? (
          await Promise.all(
            nested.filter(polish).map((n) => sitemapUrls(n, depth + 1).catch(() => [])),
          )
        ).flat()
      : [];
  const all = [...pages.filter(polish), ...children];
  sitemapCache.set(url, all);
  return all;
}

/** Best URL whose slug shares the most name tokens; null when the match is weak. */
/** Dose numbers in a name ("2000 IU", "720 mg") — a page with another dose is another product. */
const doses = (s: string) =>
  [...norm(s).matchAll(/\b(\d+(?:\s\d{3})?)\s?(iu|j m|mg|mcg|ug|g)\b/g)].map((m) =>
    m[1].replace(" ", ""),
  );

function bestUrl(name: string, urls: string[]): string | null {
  // Pack sizes ("120 kaps.") are rarely in the maker's URL — match the formula words
  const want = new Set(
    [...tokens(name)].filter(
      (t) => !/^\d+$/.test(t) && !/^(kaps\w*|tabl\w*|sasz\w*|szt|ml|g|x|nowosc)$/.test(t),
    ),
  );
  let best: { url: string; score: number } | null = null;
  for (const url of urls) {
    const slug = tokens(decodeURIComponent(url.split("/").filter(Boolean).pop() ?? ""));
    if (!doses(name).every((d) => slug.has(d))) continue;
    let shared = 0;
    for (const t of want) if (slug.has(t)) shared++;
    const score = shared / Math.max(want.size, 1);
    if (!best || score > best.score) best = { url, score };
  }
  return best && best.score >= 0.6 ? best.url : null;
}

function pageText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, form, iframe, svg").remove();
  const text = $("main").length ? $("main").text() : $("body").text();
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 40_000);
}

const flat = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

const FACT_SCHEMA = {
  type: "object",
  properties: {
    productMatch: { enum: ["exact", "other-pack", "unsure", "no"] },
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: {
            enum: [
              "nutritionFacts",
              "ingredients",
              "usage",
              "warnings",
              "storage",
              "ean",
              "producer",
              "form",
              "certification",
              "allergen",
              "other",
            ],
          },
          quote: { type: "string" },
        },
        required: ["field", "quote"],
      },
    },
  },
  required: ["productMatch", "facts"],
};

const EXTRACT_SYSTEM = `Wyciągasz fakty o produkcie z tekstu strony. Kopiujesz DOSŁOWNIE fragmenty tekstu (bez zmian, bez tłumaczenia, bez streszczania). Każdy "quote" musi być dokładnym fragmentem tekstu strony. Pola: skład na porcję z ilościami i %RWS (nutritionFacts), pełna lista składników (ingredients), sposób użycia (usage), ostrzeżenia i przeciwwskazania (warnings), przechowywanie (storage), kod EAN (ean), producent/importer z adresem (producer), forma i ilość w opakowaniu (form), certyfikaty (certification), alergeny (allergen). Pomiń marketing i opinie. productMatch: "exact" jeśli strona dotyczy dokładnie tego produktu i opakowania, "other-pack" jeśli to ten sam produkt (ta sama dawka i skład) w innym opakowaniu, "no" jeśli to inny produkt — także gdy różni się dawka (np. 2000 IU vs 5000 IU) lub wersja (forte, vegan, max).`;

const PHOTO_SCHEMA = {
  type: "object",
  properties: {
    nameOnLabel: { type: "string", maxLength: 120 },
    packSizeOnLabel: { type: ["string", "null"], maxLength: 60 },
    isSupplementPack: { type: "boolean" },
  },
  required: ["nameOnLabel", "packSizeOnLabel", "isSupplementPack"],
};

/** "60 kaps." / "60 kapsułek" / "60 caps" → "60"; the count we compare. */
const packNumber = (s: string | null | undefined) =>
  s?.match(/(\d+[.,]?\d*)\s*(kaps|caps|tabl|tab|sasz|g\b|ml|szt|porcj)/i)?.[1] ?? null;

async function main() {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".input.json"));
  // Phase 1 — pages + facts (text model stays loaded for the whole batch)
  for (const file of files) {
    const key = file.replace(".input.json", "");
    const out = path.join(dir, `${key}.sources.json`);
    if (fs.existsSync(out) && !force) continue;
    const input = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const first = input.products[0];
    const notFound: string[] = [];
    const sources: object[] = [];

    // 1–3. Page → verbatim facts
    const manual = path.join(dir, `${key}.url.txt`);
    let url: string | null = fs.existsSync(manual) ? fs.readFileSync(manual, "utf8").trim() : null;
    if (!url) {
      const maps = SITEMAPS[first.brand] ?? SITEMAPS[first.parentBrand] ?? [];
      const urls = (await Promise.all(maps.map((m) => sitemapUrls(m).catch(() => [])))).flat();
      url = bestUrl(first.current.namePl, urls);
    }
    if (url) {
      try {
        const text = pageText((await get(url)).toString("utf8"));
        const res = await chatJson<{
          productMatch: string;
          facts: { field: string; quote: string }[];
        }>({
          model: TEXT_MODEL,
          system: EXTRACT_SYSTEM,
          user: `Produkt: ${first.current.namePl} (${first.brand}); opakowania: ${input.products
            .flatMap(
              (p: { variants: { optionValue: string | null }[]; current: { namePl: string } }) =>
                p.variants.map((v) => v.optionValue ?? p.current.namePl),
            )
            .join(", ")}\n\nTEKST STRONY:\n${text}`,
          schema: FACT_SCHEMA,
        });
        const page = flat(text);
        const kept = res.facts.filter(
          (f) => f.quote.trim().length > 3 && page.includes(flat(f.quote)),
        );
        if (res.facts.length > kept.length)
          notFound.push(`${res.facts.length - kept.length} non-verbatim quotes dropped`);
        if (res.productMatch !== "no" && kept.length > 0) {
          sources.push({
            id: "S1",
            url,
            tier: "manufacturer",
            productMatch: res.productMatch,
            facts: kept.map((f) => ({ ...f, note: null })),
          });
        } else notFound.push(`page ${url} did not match or had no facts`);
      } catch (e) {
        notFound.push(`fetch/extract failed: ${(e as Error).message}`);
      }
    } else notFound.push("product page not found in sitemap — needs KEY.url.txt");

    // Supplier file rows are a source as-is (verbatim by construction)
    if (input.supplierRows.length) {
      sources.push({
        id: `S${sources.length + 1}`,
        url: null,
        tier: "supplier-file",
        productMatch: "exact",
        facts: input.supplierRows.map((r: object) => ({
          field: "other",
          quote: JSON.stringify(r),
          note: null,
        })),
      });
    }

    // images: null = photo phase still to do
    fs.writeFileSync(
      out,
      JSON.stringify({ key, sources, images: null, officialImageUrls: [], notFound }, null, 1),
    );
    console.log(
      `${key}: ${sources.length} source(s)${notFound.length ? ` — ${notFound.join("; ")}` : ""}`,
    );
  }

  // Phase 2 — photos (vision model stays loaded for the whole batch)
  for (const file of files) {
    const key = file.replace(".input.json", "");
    const out = path.join(dir, `${key}.sources.json`);
    if (!fs.existsSync(out)) continue;
    const result = JSON.parse(fs.readFileSync(out, "utf8"));
    if (result.images !== null && !force) continue;
    const input = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    // 4. Photos — the vision model only reads the label; the verdict is computed
    const images: object[] = [];
    for (const p of input.products) {
      const expected = packNumber(p.current.namePl) ?? packNumber(p.variants[0]?.optionValue);
      for (const img of p.images) {
        try {
          // Vision models want JPEG/PNG; Cloudinary's f_auto may send AVIF
          const src = img.url.replace("/upload/f_auto,q_auto/", "/upload/f_jpg,q_80,w_800/");
          const b64 = (await get(src).catch(() => get(src))).toString("base64");
          const seen = await chatJson<{
            nameOnLabel: string;
            packSizeOnLabel: string | null;
            isSupplementPack: boolean;
          }>({
            model: VISION_MODEL,
            system:
              "Czytasz etykietę opakowania na zdjęciu. Przepisz nazwę produktu i wielkość opakowania dokładnie tak, jak są wydrukowane. Jeśli nie da się odczytać, packSizeOnLabel = null.",
            user: "Odczytaj etykietę.",
            schema: PHOTO_SCHEMA,
            images: [b64],
          });
          const seenPack = packNumber(seen.packSizeOnLabel);
          const nameOk = [...tokens(seen.nameOnLabel)].some(
            (t) => t.length > 3 && tokens(p.current.namePl).has(t),
          );
          const matchesProduct = !nameOk
            ? "unsure"
            : expected && seenPack
              ? seenPack === expected
              : "unsure";
          images.push({
            imageId: img.id,
            productId: p.id,
            matchesProduct,
            // The vision model sometimes trails junk after the value
            showsPack: seen.packSizeOnLabel?.split(/["}\u200b]/)[0].trim() ?? null,
            note: `label: ${seen.nameOnLabel}`,
          });
        } catch (e) {
          images.push({
            imageId: img.id,
            productId: p.id,
            matchesProduct: "unsure",
            showsPack: null,
            note: `not checked: ${(e as Error).message}`,
          });
        }
      }
    }

    fs.writeFileSync(out, JSON.stringify({ ...result, images }, null, 1));
    console.log(`${key}: ${images.length} photo(s) checked`);
  }
}

main();
