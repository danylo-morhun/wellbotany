import { chromium, type Page } from "playwright";
import { parsePriceToGrosz } from "../price";
import {
  CAFFEINE_WARNING_PL,
  detectAllergens,
  looksLikeRealPhoto,
  needsCaffeineWarning,
  uploadScrapedImage,
} from "../scrape-helpers";
import type { SupplierProductDraft, SupplierVariantDraft } from "../types";

const BASE_URL = "https://sklep.omni-biotic.pl";
const SOURCE_ID = "omni-biotic";
const BRAND_NAME = "OMNi-BiOTiC";
const BRAND_SLUG = "omni-biotic";

type ListingItem = { name: string; url: string };

type EanRow = { weightG: number; packDescriptor: string; ean: string };

type PageContent = {
  descriptionPl?: string;
  ingredientsPl?: string;
  usageInstructionsPl?: string;
  healthWarnings?: string[];
  storageInfo?: string;
  responsibleEntity?: string;
  certifications?: string[];
  benefitsPl?: string[];
  eanTable: EanRow[];
  nutritionFacts: Array<{ name: string; amount: string; rws?: string }>;
};

async function collectListing(page: Page): Promise<ListingItem[]> {
  const items: ListingItem[] = [];
  for (let pageNum = 1; pageNum <= 20; pageNum++) {
    const url = pageNum === 1 ? `${BASE_URL}/sklep` : `${BASE_URL}/sklep/${pageNum}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const pageItems = await page.evaluate((base) => {
      const cards = Array.from(document.querySelectorAll(".product-main-wrap"));
      return cards
        .map((card) => {
          const link = card.querySelector<HTMLAnchorElement>("a.prodname");
          const name = card.querySelector(".productname")?.textContent?.trim();
          if (!link || !name) return null;
          const href = link.getAttribute("href") || "";
          const url = href.startsWith("http") ? href : `${base}${href}`;
          return { name, url };
        })
        .filter((v): v is ListingItem => v !== null);
    }, BASE_URL);

    if (pageItems.length === 0) break;
    items.push(...pageItems);
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

// Runs against the live document (either the real detail page, or after
// page.setContent) — DOM queries, never regex on raw HTML, so HTML comments
// (old superseded tables/paragraphs the theme leaves in the markup) and CSS
// selector text sitting in <head> never get mistaken for real content.
async function extractPageContent(page: Page): Promise<PageContent> {
  return page.evaluate(() => {
    // tsx/esbuild always wraps a *named* const/function binding in a
    // `__name(fn, "fn")` call for stack-trace readability (its `keepNames`
    // option is hardcoded on, no per-file opt-out) — but Playwright ships
    // only this callback's own source to the browser, where that helper
    // isn't defined, so every inner helper below would throw. Functions
    // inside an array literal that's immediately destructured never get an
    // inferred name, so esbuild leaves them alone — this is that workaround,
    // not a stylistic choice.
    const [clean, stripLeadingHeading, isStorage, cellsOf] = [
      (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim(),
      (el: Element | null): string | undefined => {
        if (!el) return undefined;
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelector("h5")?.remove();
        const text = clean(clone.textContent);
        return text || undefined;
      },
      (s: string) => /przechowywać/i.test(s),
      (row: Element) =>
        Array.from(row.querySelectorAll(".prod-table-col")).map((c) => clean(c.textContent)),
    ];

    const descBlocks = Array.from(document.querySelectorAll("#tab1 .desc-section .desc-text"))
      .map((el) => clean(el.textContent))
      .filter(Boolean);
    const descriptionPl = descBlocks.length ? descBlocks.join("\n\n") : undefined;

    const ingredientsPl = stripLeadingHeading(document.querySelector("#tab2 .text-section"));
    const usageInstructionsPl = stripLeadingHeading(document.querySelector("#tab3 .text-section"));

    const tab1Paragraphs = Array.from(document.querySelectorAll("#tab1 p"));

    const disclaimerP = tab1Paragraphs.find((p) =>
      /zróżnicowanej diety|zamiennik.*diety/i.test(p.textContent || ""),
    );
    let healthWarnings: string[] | undefined;
    let storageInfo: string | undefined;
    if (disclaimerP) {
      // The paragraph also carries a "Ze względu na regulacje prawne dot. …"
      // preamble ahead of the actual disclaimer, and that preamble's own
      // "dot." abbreviation ends in a period — splitting on sentence-ending
      // punctuation first (before anchoring) breaks the preamble into two
      // pieces and lets the second half leak through as a fake warning. Cut
      // to the disclaimer's fixed opening phrase first, then split.
      const fullText = disclaimerP.textContent || "";
      const anchorIdx = fullText.search(/Suplementy diety/i);
      const relevant = anchorIdx >= 0 ? fullText.slice(anchorIdx) : fullText;
      const sentences = relevant
        .split(/(?<=[.!?])\s+/)
        .map((s) => clean(s))
        .filter(Boolean);
      const storageSentences = sentences.filter(isStorage);
      const warningSentences = sentences.filter((s) => !isStorage(s));
      healthWarnings = warningSentences.length ? warningSentences : undefined;
      storageInfo = storageSentences.length ? storageSentences.join(" ") : undefined;
    }

    const producerLabel = tab1Paragraphs.find((p) => /^producent:?$/i.test(clean(p.textContent)));
    let responsibleEntity: string | undefined;
    const producerValueEl = producerLabel?.nextElementSibling;
    if (producerValueEl?.tagName === "P") {
      const lines = producerValueEl.innerHTML
        .split(/<br\s*\/?>/i)
        .map((s) => clean(s.replace(/<[^>]+>/g, "")))
        .filter(Boolean);
      responsibleEntity = lines.join(", ") || undefined;
    }

    const eanTable: EanRow[] = [];
    for (const p of tab1Paragraphs) {
      const text = p.textContent || "";
      if (!/masa netto/i.test(text) || !/EAN/i.test(text)) continue;
      const m = text.match(/masa netto:\s*([\d.,]+)\s*g\s*\(([^)]*)\)\s*-\s*EAN:\s*(\d+)/i);
      if (!m) continue;
      eanTable.push({
        weightG: Number.parseFloat(m[1].replace(",", ".")),
        packDescriptor: clean(m[2]),
        ean: m[3].trim(),
      });
    }

    const certifications = Array.from(document.querySelectorAll("#tab4 .certificate-item h3"))
      .map((h) => clean(h.textContent))
      .filter(Boolean);

    // Short audience/suitability badges ("Dla wegan i wegetarian", "Dla
    // alergików"...) shown as icons right under the gallery — the closest
    // thing this theme has to a "key benefits" checkmark list, and genuine
    // supplier copy rather than an invented claim.
    const benefitsPl = Array.from(document.querySelectorAll(".desc-icons .desc-ico strong"))
      .map((el) => clean(el.textContent))
      .filter(Boolean);

    // Nutrition table: group `.prod-table-row` siblings by preceding
    // `.prod-table-head` row, then keep only the group that has a "% RWS"
    // row — that's the active-ingredients table (a plain macronutrient
    // table has no RWS rows and isn't what SupplierProductDraft.nutritionFacts
    // is for). Browser DOM parsing already drops HTML-commented-out legacy
    // tables, so this never picks up superseded markup.
    const allRows = Array.from(document.querySelectorAll("#tab2 .prod-table-row"));
    type TableGroup = { header: Element; rows: Element[] };
    const groups: TableGroup[] = [];
    let current: TableGroup | null = null;
    for (const row of allRows) {
      if (row.classList.contains("prod-table-head")) {
        current = { header: row, rows: [] };
        groups.push(current);
      } else if (current) {
        current.rows.push(row);
      }
    }
    const target = groups.find((g) => g.rows.some((r) => /rws/i.test(cellsOf(r)[0] || "")));

    const nutritionFacts: Array<{ name: string; amount: string; rws?: string }> = [];
    if (target) {
      const headerCells = cellsOf(target.header);
      let valueIdx = headerCells.findIndex((t, i) => i > 0 && /dzienna porcj/i.test(t));
      if (valueIdx === -1) valueIdx = headerCells.findIndex((t, i) => i > 0 && /porcj/i.test(t));
      if (valueIdx === -1) valueIdx = 1;

      for (let i = 0; i < target.rows.length; i++) {
        const cells = cellsOf(target.rows[i]);
        const label = cells[0];
        if (!label || /^%?\s*rws$/i.test(label)) continue;
        const amount = cells[valueIdx];
        if (!amount) continue;
        let rws: string | undefined;
        const next = target.rows[i + 1];
        if (next) {
          const nextCells = cellsOf(next);
          if (/rws/i.test(nextCells[0] || "")) {
            rws = nextCells[valueIdx] || undefined;
            i++;
          }
        }
        nutritionFacts.push({ name: label, amount, rws });
      }
    }

    return {
      descriptionPl,
      ingredientsPl,
      usageInstructionsPl,
      healthWarnings,
      storageInfo,
      responsibleEntity,
      certifications: certifications.length ? certifications : undefined,
      benefitsPl: benefitsPl.length ? benefitsPl : undefined,
      eanTable,
      nutritionFacts,
    };
  });
}

// Cuts at a sentence boundary near `maxLen`, never mid-word — falls back to
// the full text when it's already short (short/full identical is correct
// when the source is genuinely one short sentence, not a bug). Only splits
// before a capital letter (a real new sentence) — plain `[.!?]\s+` also
// fires on abbreviations (e.g. "godz.", "min.") followed by a lowercase
// word or digit, cutting the text off mid-thought.
function cutFirstSentences(text: string, maxLen = 220): string {
  if (text.length <= maxLen) return text;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/);
  let out = "";
  for (const s of sentences) {
    if (out && out.length + s.length > maxLen) break;
    out = out ? `${out} ${s}` : s;
    if (out.length >= maxLen * 0.5) break;
  }
  return out || text.slice(0, maxLen);
}

function matchVariantEan(optionLabel: string, table: EanRow[]): string | undefined {
  const countMatch = optionLabel.match(/(\d+)\s*sasz/i);
  if (countMatch) {
    const row = table.find((r) =>
      new RegExp(`^${countMatch[1]}\\s*sasz`, "i").test(r.packDescriptor),
    );
    if (row) return row.ean;
  }
  const gMatch = optionLabel.match(/(\d+)\s*g\b/i);
  if (gMatch) {
    const row = table.find((r) => r.weightG === Number(gMatch[1]));
    if (row) return row.ean;
  }
  return undefined;
}

function servingsFromPackDescriptor(descriptor: string | undefined): number | undefined {
  const m = descriptor?.match(/(\d+)\s*(sasz|miarek|kaps|tabl)/i);
  return m ? Number(m[1]) : undefined;
}

function classifyCategory(name: string): string {
  if (/\b(cat|dog|pies|kot)\b/i.test(name)) return "Probiotyki dla zwierząt";
  if (/^OMNi-LOGiC/i.test(name)) return "Prebiotyki";
  if (/MikroSan/i.test(name)) return "Postbiotyki";
  return "Probiotyki";
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

type RadioOption = {
  value: string;
  label: string;
  forId: string;
  checked: boolean;
  visible: boolean;
};

async function readRadioOptions(page: Page): Promise<RadioOption[]> {
  return page.evaluate(() => {
    const radios = Array.from(
      document.querySelectorAll<HTMLInputElement>('input[type="radio"][name^="option_"]'),
    );
    return radios.map((r) => {
      const label = document.querySelector<HTMLElement>(`label[for="${r.id}"]`);
      return {
        value: r.value,
        forId: r.id,
        checked: r.hasAttribute("checked") || r.checked,
        label: label?.textContent?.trim() || "",
        // A packaging option out of stock is hidden by the theme (its
        // wrapper gets a `.none` class) rather than removed — a click on it
        // never becomes clickable and would hang the whole product. Only
        // real, purchasable options should ever be clicked.
        visible: !!label && label.offsetParent !== null,
      };
    });
  });
}

export async function scrapeProduct(
  page: Page,
  item: ListingItem,
  index: number,
): Promise<SupplierProductDraft | null> {
  await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(400);
  // The cookie-consent modal covers the whole page on first load and
  // intercepts every click (including the packaging radios) until
  // dismissed — it only shows once per browser context, so this is a no-op
  // on later pages, but must run before any variant click below.
  await page
    .locator('button:has-text("Zaakceptuj wszystkie")')
    .first()
    .click({ timeout: 3000 })
    .catch(() => {});

  const name = await page
    .evaluate(() => document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim())
    .catch(() => undefined);
  const finalName = name || item.name;

  const productId = await page
    .evaluate(() => document.querySelector<HTMLInputElement>('input[name="product_id"]')?.value)
    .catch(() => undefined);

  const galleryImageUrls = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>(".gallery-wrap img"))
      .map((img) => img.src)
      .filter((src) => src && !src.startsWith("data:")),
  );

  const content = await extractPageContent(page);
  const allRadios = await readRadioOptions(page);
  // Some themes render a duplicate radio set for a responsive breakpoint —
  // dedupe by `value` (Shoper's option-value id) so a single real packaging
  // option never gets double-counted as two variants.
  const seenValues = new Set<string>();
  const radios = allRadios
    .filter((r) => r.visible)
    .filter((r) => {
      if (seenValues.has(r.value)) return false;
      seenValues.add(r.value);
      return true;
    });

  const vatRate = /\b(cat|dog|pies|kot)\b/i.test(finalName) ? 23 : 8;
  const categoryName = classifyCategory(finalName);

  const ingredientsPl = content.ingredientsPl;
  const allergenContains = ingredientsPl ? detectAllergens(ingredientsPl) : [];
  const needsCaffeine = needsCaffeineWarning(`${finalName} ${ingredientsPl || ""}`);
  const healthWarnings = needsCaffeine
    ? [...(content.healthWarnings || []), CAFFEINE_WARNING_PL]
    : content.healthWarnings;

  const descriptionPl = content.descriptionPl;
  const shortDescPl = descriptionPl ? cutFirstSentences(descriptionPl) : undefined;

  // sklep.omni-biotic.pl isn't in next.config.ts's images.remotePatterns —
  // falling back to the raw supplier URL when the Cloudinary upload fails
  // (e.g. this script run without --env-file=.env.local, so the upload
  // preset env vars are unset) silently produces a <Image> the site can
  // never render. Leaving it undefined here is directly visible in the
  // import summary; a hotlinked-but-broken URL is not.
  let imageUrl: string | undefined;
  const mainImageSrc = galleryImageUrls[0];
  if (mainImageSrc) {
    const bytes = await downloadImage(mainImageSrc);
    if (bytes && looksLikeRealPhoto(bytes.length)) {
      imageUrl = (await uploadScrapedImage(bytes, `omni-biotic-${index}.webp`)) ?? undefined;
    }
  }

  const extraImageUrls: string[] = [];
  for (const src of galleryImageUrls.slice(1, 5)) {
    const bytes = await downloadImage(src);
    if (!bytes || !looksLikeRealPhoto(bytes.length)) continue;
    const uploaded = await uploadScrapedImage(
      bytes,
      `omni-biotic-${index}-${extraImageUrls.length}.webp`,
    );
    if (uploaded) extraImageUrls.push(uploaded);
  }

  const shared = {
    sourceId: SOURCE_ID,
    externalKey: productId || item.url,
    name: finalName,
    brandName: BRAND_NAME,
    brandSlug: BRAND_SLUG,
    categoryName,
    vatRate,
    imageUrl,
    extraImageUrls,
    descriptionPl,
    shortDescPl,
    benefitsPl: content.benefitsPl,
    ingredientsPl,
    nutritionFacts: content.nutritionFacts.length ? content.nutritionFacts : undefined,
    healthWarnings,
    storageInfo: content.storageInfo,
    usageInstructionsPl: content.usageInstructionsPl,
    allergenContains: allergenContains.length ? allergenContains : undefined,
    responsibleEntity: content.responsibleEntity,
    certifications: content.certifications,
  };

  if (radios.length > 1) {
    const variants: SupplierVariantDraft[] = [];
    for (const radio of radios) {
      try {
        await page.locator(`label[for="${radio.forId}"]`).first().click({ timeout: 5000 });
      } catch {
        continue; // e.g. went out of stock between the visibility check and this click
      }
      await page.waitForTimeout(350);
      const priceText = await page.evaluate(
        () => document.querySelector(".main-price")?.textContent,
      );
      const priceGrosz = parsePriceToGrosz(priceText || undefined);
      if (!priceGrosz) continue;
      const ean = matchVariantEan(radio.label, content.eanTable);
      variants.push({
        optionValue: radio.label,
        ean,
        priceGrosz,
        stock: 50,
        isDefault: radio.checked,
      });
    }
    if (variants.length === 0) return null;
    if (!variants.some((v) => v.isDefault)) variants[0].isDefault = true;

    const firstMatchedRow = content.eanTable[0];
    return {
      ...shared,
      priceGrosz: variants.find((v) => v.isDefault)?.priceGrosz ?? variants[0].priceGrosz,
      stock: 50,
      packaging: firstMatchedRow
        ? `${firstMatchedRow.weightG} g (${firstMatchedRow.packDescriptor})`
        : undefined,
      variants,
    };
  }

  const priceText = await page.evaluate(() => document.querySelector(".main-price")?.textContent);
  const priceGrosz = parsePriceToGrosz(priceText || undefined);
  if (!priceGrosz) return null;

  const meta = await page.evaluate(() => ({
    ean: document.querySelector('meta[itemprop="gtin"]')?.getAttribute("content") || undefined,
    sku: document.querySelector('meta[itemprop="sku"]')?.getAttribute("content") || undefined,
  }));

  // Only trust the packaging descriptor when it's actually the row for this
  // product's own EAN — a short-dated/promo listing can carry a different
  // EAN than every "masa netto" line on its page (verified on OMNi-LOGiC
  // IMMUNE's short-dated variant), so falling back to eanTable[0] there
  // would silently attach the wrong pack size/serving count.
  const eanRow = content.eanTable.find((r) => r.ean === meta.ean);

  return {
    ...shared,
    sku: meta.sku,
    ean: meta.ean,
    priceGrosz,
    stock: 50,
    packaging: eanRow ? `${eanRow.weightG} g (${eanRow.packDescriptor})` : undefined,
    servingsPerContainer: servingsFromPackDescriptor(eanRow?.packDescriptor),
  };
}

export async function scrapeOmniBiotic(limit?: number): Promise<SupplierProductDraft[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("[omni-biotic] collecting listing…");
  const items = await collectListing(page);
  console.log(`[omni-biotic] found ${items.length} listing items`);

  const toScrape = limit ? items.slice(0, limit) : items;
  const drafts: SupplierProductDraft[] = [];

  for (let i = 0; i < toScrape.length; i++) {
    const item = toScrape[i];
    console.log(`[omni-biotic] ${i + 1}/${toScrape.length}: ${item.name}`);
    try {
      const draft = await scrapeProduct(page, item, i);
      if (draft) drafts.push(draft);
      else console.log(`  ⚠ skipped (no price found)`);
    } catch (error) {
      console.log(`  ⚠ failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  await browser.close();
  console.log(`[omni-biotic] scraped ${drafts.length} products`);
  return drafts;
}
