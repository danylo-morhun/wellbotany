import { chromium } from "playwright";
import { parsePriceToGrosz } from "../price";
import {
  CAFFEINE_WARNING_PL,
  detectAllergens,
  isPlaceholderImageSrc,
  looksLikeRealPhoto,
  needsCaffeineWarning,
  uploadScrapedImage,
} from "../scrape-helpers";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

const CATALOG_URL = "https://sklep.drjacobs.pl/pl/c/Wszystkie-produkty-alfabetycznie/41";
const SHOP_BASE = "https://sklep.drjacobs.pl";

// Scraped once from the shop footer (Kontakt / Dane firmy) — identical for
// every product in this catalog, per the import-supplier skill's guidance to
// scrape it once and reuse rather than fetch it per-product.
const RESPONSIBLE_ENTITY =
  "Dr. Jacob's Poland, ul. Kasprzaka 7/U1, 01-211 Warszawa (przedstawiciel Dr. Jacob's Medical GmbH)";

interface ListingCard {
  id: string;
  name: string;
  href: string;
  category?: string;
  priceText?: string;
  imageUrl?: string;
}

async function collectListing(page: import("playwright").Page): Promise<ListingCard[]> {
  await page.goto(CATALOG_URL, { waitUntil: "networkidle", timeout: 60000 });

  return page.evaluate((shopBase) => {
    const items: ListingCard[] = [];
    document.querySelectorAll(".products .product").forEach((el) => {
      const id = el.getAttribute("data-product-id");
      const category = el.getAttribute("data-category") || undefined;
      const link = el.querySelector("a[href*='/pl/p/']");
      const href = link?.getAttribute("href") || undefined;
      const nameEl = el.querySelector(".productname");
      const name = nameEl?.textContent?.trim();
      const priceEl = el.querySelector(".price em");
      const priceText = priceEl?.textContent?.trim();
      const img = el.querySelector("img");
      const rawSrc = img?.getAttribute("src") || undefined;
      const dataSrc = img?.getAttribute("data-src") || undefined;
      const src = dataSrc && !dataSrc.startsWith("data:") ? dataSrc : rawSrc;
      const imageUrl =
        src && !src.startsWith("data:") ? new URL(src, shopBase).toString() : undefined;

      if (id && href && name) {
        items.push({
          id,
          name,
          href: new URL(href, shopBase).toString(),
          category,
          priceText,
          imageUrl,
        });
      }
    });
    return items;
  }, SHOP_BASE);
}

interface DetailData {
  title?: string;
  descriptionText: string;
  countryOfOrigin?: string;
  mainImageUrl?: string;
}

async function scrapeDetail(page: import("playwright").Page, url: string): Promise<DetailData> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

  return page.evaluate((shopBase) => {
    const title = document.querySelector("h1")?.textContent?.trim();

    // innerText (not textContent) so <br>/<p>/<li> boundaries become real
    // newlines — the source HTML puts each "✓ benefit" line in its own <p>
    // with no space before the next one, so textContent glues them into one
    // run-on word (e.g. "88 porcjiWitamina C..."). innerText renders them
    // the way a browser would, matching how a human reads the page.
    //   (non-breaking space) shows up wherever the source HTML used
    // "&nbsp;" for fixed spacing (e.g. "Koszt&nbsp;jednej...") — the browser
    // renders it as a real NBSP character in innerText, not the literal
    // text "&nbsp;", so it's invisible in any printed/logged text but is a
    // *different* character than a normal space. Left unnormalized, every
    // downstream `^literal words` regex silently fails to match a line that
    // reads identically to a human. Collapse it into a normal space here,
    // before anything else touches this text.
    const descEl = document.querySelector<HTMLElement>("#box_description");
    const descriptionText =
      descEl?.innerText
        ?.replace(/[ \t ]+/g, " ")
        .replace(/\n{2,}/g, "\n\n")
        .trim() ?? "";

    let countryOfOrigin: string | undefined;
    document.querySelectorAll(".product-attributes tr").forEach((row) => {
      const name = row.querySelector("td.name")?.textContent?.trim().toLowerCase();
      const value = row.querySelector("td.value")?.textContent?.trim();
      if (name?.includes("kraj produkcji") && value) countryOfOrigin = value;
    });

    const mainImg = document.querySelector<HTMLImageElement>("img.productimg");
    const mainSrc = mainImg?.getAttribute("src") || undefined;
    const mainImageUrl = mainSrc ? new URL(mainSrc, shopBase).toString() : undefined;

    return { title, descriptionText, countryOfOrigin, mainImageUrl };
  }, SHOP_BASE);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Cuts the text at the first of any marker regex, or returns the whole string. */
function cutAtFirst(text: string, markers: RegExp[]): string {
  let cutIdx = text.length;
  for (const marker of markers) {
    const m = marker.exec(text);
    if (m && m.index < cutIdx) cutIdx = m.index;
  }
  return text.slice(0, cutIdx).trim();
}

const SECTION_END_MARKERS = [
  /Może zawierać/i,
  /Przechowywać/i,
  /Nie należy przekraczać/i,
  /Nie przekraczać/i,
  /UWAGA:/i,
  /Uwaga:/i,
  /Porcja zalecana/i,
  /Sposób użycia/i,
  /Materiał(y)? w Czytelni/i,
  /Materiał(y)? z Czytelni/i,
  /Składniki:/i,
];

function extractIngredients(text: string): string | undefined {
  const m = /Składniki:\s*/i.exec(text);
  if (!m) return undefined;
  const rest = text.slice(m.index + m[0].length);
  // Includes a second "Składniki:" as an end marker — some product pages
  // (AloeVera Plus) follow the real ingredients paragraph with a block of
  // serving-suggestion recipes, each headed "<Recipe name> Składniki: ...",
  // which would otherwise be swallowed whole into the ingredients field.
  const cut = cutAtFirst(rest, [
    ...SECTION_END_MARKERS,
    /Przepisy (na użycie|z)/i,
    /Zalecane (spożycie|dzienne spożycie)/i,
    // Bottled-liquid products (AloeVera family) follow the real ingredient
    // list + footnotes with an unrelated PET-bottle marketing tangent.
    /Butelka (jest|z wysokiej)/i,
    /Zdrowe butelki PET/i,
    /Ekologiczna ocena/i,
    /Analiza soku/i,
  ]);
  const cleaned = decodeEntities(cut).replace(/\s+/g, " ").trim();
  return cleaned.length > 5 ? cleaned : undefined;
}

function extractUsageInstructions(text: string): string | undefined {
  const startRe = /(Porcja zalecana do spożycia[^:]*:|Sposób użycia:)/i;
  const m = startRe.exec(text);
  if (!m) return undefined;
  const rest = text.slice(m.index);
  const ends = [
    /Składniki:/i,
    /Może zawierać/i,
    /Przechowywać/i,
    /Materiał(y)? w Czytelni/i,
    /Materiał(y)? z Czytelni/i,
  ];
  const cut = cutAtFirst(rest, ends);
  const cleaned = decodeEntities(cut)
    .replace(/[ \t]+/g, " ")
    .trim();
  return cleaned.length > 10 ? cleaned : undefined;
}

function extractStorageInfo(text: string): string | undefined {
  const m = /Przechowywać[^.]*\./gi.exec(text);
  if (!m) return undefined;
  return decodeEntities(m[0]).replace(/\s+/g, " ").trim();
}

/** The standard "not a substitute for a varied diet" disclaimer — present in
 *  synonym variants across the catalog (substytut/zamiennik, diety/dieta). */
function extractStandardDisclaimer(text: string): string | undefined {
  const m = /[^.]*(substytut|zamiennik)[^.]*(zróżnicowanej|zrównoważonej)[^.]*diety[^.]*\./i.exec(
    text,
  );
  if (!m) return undefined;
  return decodeEntities(m[0]).replace(/\s+/g, " ").trim();
}

function extractDosageLimitWarning(text: string): string | undefined {
  const m = /(Nie należy przekraczać|Nie przekraczać)[^.]*\./i.exec(text);
  if (!m) return undefined;
  return decodeEntities(m[0]).replace(/\s+/g, " ").trim();
}

function extractUwagaWarning(text: string): string | undefined {
  const m = /(UWAGA|Uwaga):\s*([^.]*\.(?:[^.]*\.)?)/.exec(text);
  if (!m) return undefined;
  return decodeEntities(`Uwaga: ${m[2]}`).replace(/\s+/g, " ").trim();
}

function extractTraceAllergenNote(text: string): { sentence?: string; items: string[] } {
  const m = /Może zawierać śladowe ilości[^.]*\./i.exec(text);
  if (!m) return { items: [] };
  const sentence = decodeEntities(m[0]).replace(/\s+/g, " ").trim();
  const items = detectAllergens(sentence);
  return {
    sentence,
    items:
      items.length > 0
        ? items
        : [sentence.replace(/^Może zawierać śladowe ilości\s*/i, "").replace(/\.$/, "")],
  };
}

/** "60 kapsułek (60 porcji)" / "640 kropli po 20μg..." / "8 porcji" near the
 *  top of the description, right after "zawartość netto: X". */
function extractServingsPerContainer(text: string): number | undefined {
  const porcjiMatch = /\((\d+)\s*porcj/i.exec(text);
  if (porcjiMatch) return Number(porcjiMatch[1]);
  const unitMatch = /(\d+)\s*(kapsułek|kapsułki|tabletek|tabletki|saszetek|kropli|sasz\.)/i.exec(
    text,
  );
  if (unitMatch) return Number(unitMatch[1]);
  return undefined;
}

// Packaging/pricing boilerplate that sits *inside* the marketing body, not
// just at its top — e.g. "zawartość netto: 150g" / "88 porcji" / "0,67 zł za
// porcję" / "Produkt wegański, bez glutenu" all appear between the intro
// tagline and the first real descriptive paragraph, not only before it. A
// leading-only skip (checked once, stops at the first real content line)
// misses every one of these, which is why they used to show up glued into
// the middle of `shortDescPl`.
// Safe to drop from the FULL description too — pure packaging/pricing/tag
// wrapper lines that carry no regulated label content (the actual %RWS
// dosage figures they introduce are handled separately, see
// SPEC_VALUE_LINE_PATTERNS below, and are deliberately NOT in this list).
const BOILERPLATE_LINE_PATTERNS = [
  /^suplement diety$/i,
  /^zawartość netto\b/i, // colon after "netto" isn't consistent across the catalog
  /^opakowanie:/i,
  /^produkt weg/i, // wegański / wegetariański, with or without a trailing clause
  /^koszt (jednej|dziennej)/i, // "koszt jednej kropli...", "koszt dziennej porcji..."
  /^\(.*\)$/, // a line that's nothing but a parenthetical, e.g. "(menachinon-7, MK-7, MenaQ-7)"
  /^\*/, // a footnote marker line, e.g. "* % zalecanego dziennego spożycia"
  /^\d+([.,]\d+)?\s*zł\s*za\s*porcj/i,
  /^\d+\s*(kropli-porcji|kropli|porcji|kapsułek|kapsułki|tabletek|tabletki|saszetek|miarek|miarki)\b/i,
];

// Bare per-nutrient dosage bullets (e.g. "20μg / 800 j.m. (400%*) witaminy
// D3," or "100 µg B12 (metylokobalaminy) w tabletce.") state a %RWS/dosage
// fact — EU labeling-relevant, so they stay in the full `descriptionPl`.
// They're still noise in a short marketing teaser, so this second tier is
// only applied when building `shortDescPl`, never the full body.
const SPEC_VALUE_LINE_PATTERNS = [/^\d+\s*(μg|µg|mg|g)\b/i];

function isBoilerplateLine(line: string, title: string | undefined): boolean {
  if (!line) return false; // blank lines kept as paragraph spacing
  if (title) {
    const t = title.toLowerCase();
    const l = line.toLowerCase();
    // Catches short duplicate-of-title fragments too (e.g. body line "Żelazo
    // liposomalne" when the h1 title is "Żelazo liposomalne Dr. Jacob's"),
    // not just an exact match.
    if (l === t || (l.length >= 10 && t.startsWith(l))) return true;
  }
  return BOILERPLATE_LINE_PATTERNS.some((re) => re.test(line));
}

function isSpecValueLine(line: string): boolean {
  return SPEC_VALUE_LINE_PATTERNS.some((re) => re.test(line));
}

function extractPackaging(text: string): string | undefined {
  // The colon after "netto" isn't consistent across the catalog — some
  // product pages write "zawartość netto: 150g", others "zawartość netto
  // 27,7 g" with no colon at all (e.g. LactoBifido) — a colon-required
  // regex silently left `netWeight` empty for every one of those.
  const m = /zawartość netto:?\s*([^\n]+)/i.exec(text);
  if (!m) return undefined;
  return decodeEntities(m[1]).replace(/\s+/g, " ").trim();
}

/** The page marks its marketing bullets with a leading "✓" on their own
 *  line (e.g. "✓ Optymalny efekt i współdziałanie składników") — pull those
 *  into `benefitsPl` so the UI renders them as a checkmark list instead of
 *  leaving the raw "✓" glyphs sitting inline in the description text. */
function extractBenefits(text: string): string[] | undefined {
  const benefits = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("✓"))
    .map((line) => decodeEntities(line.replace(/^✓\s*/, "")).trim())
    .filter((line) => line.length > 0);
  return benefits.length > 0 ? benefits.slice(0, 6) : undefined;
}

/** Drops "✓ benefit" lines from the body text before it's used for the
 *  marketing description/short description — they're extracted separately
 *  into `benefitsPl` and shouldn't also appear as raw "✓" text in the copy. */
function stripBenefitLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trim().startsWith("✓"))
    .join("\n");
}

// Only split at a sentence-ending punctuation mark when it's followed by a
// capital letter (a real new sentence) — plain `[.!?]\s+` also fires on
// abbreviations like "w godz." (godzinach) or "min." (minutach), which are
// followed by a lowercase word or a digit, not a new sentence. That bug cut
// "W naszej strefie geograficznej jest to możliwe od kwietnia do września w
// godz." off mid-thought, dropping the "10-15 przy min. 15-minutowym..."
// that finishes it.
function extractShortDesc(descriptionMarketing: string): string {
  // Bare dosage bullets (kept in the full description for label-compliance
  // reasons — see SPEC_VALUE_LINE_PATTERNS) are still pure noise in a short
  // marketing teaser, so drop them only here.
  const teaserSource = descriptionMarketing
    .split("\n")
    .filter((line) => !isSpecValueLine(line.trim()))
    .join("\n");
  const sentences = teaserSource.split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/).filter(Boolean);
  let out = "";
  for (const s of sentences) {
    if (out.length > 0 && out.length + s.length > 280) break;
    out = out ? `${out} ${s}` : s;
    if (out.length >= 120) break;
  }
  return out.trim();
}

/** The free-text marketing body: everything before "Porcja zalecana"/"Sposób
 *  użycia"/"Składniki:" (whichever comes first), with the title/tag lines at
 *  the very top of the box stripped. */
function extractMarketingDescription(text: string, title: string | undefined): string {
  const ends = [
    /Porcja zalecana do spożycia/i,
    /Sposób użycia:/i,
    /Składniki:/i,
    /UWAGA:/i,
    /Uwaga:/i,
  ];
  let body = cutAtFirst(text.replace(/^Opis\s*/i, ""), ends);

  // Drop title/"suplement diety"/packaging-boilerplate lines wherever they
  // occur in the body, not just a leading run of them.
  const lines = body.split("\n").map((l) => l.trim());
  body = lines
    .filter((line) => !isBoilerplateLine(line, title))
    .join("\n")
    .trim();

  return decodeEntities(body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toFullSizeImageUrl(src: string): string {
  // /environment/cache/images/productGfx_{id}_{w}_{h}/{name}?overlay=1
  return src.replace(/(productGfx_\d+)_\d+_\d+\//, "$1_1200_1200/").replace(/\?overlay=1$/, "");
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
  } catch {
    return null;
  }
}

export async function scrapeDrJacobs(source: SupplierSource): Promise<SupplierProductDraft[]> {
  let browser = await chromium.launch();
  const listPage = await browser.newPage();

  console.log("[dr-jacobs] collecting listing…");
  const fullListing = await collectListing(listPage);
  console.log(`[dr-jacobs] ${fullListing.length} products found`);
  await listPage.close();

  const limitEnv = Number(process.env.DR_JACOBS_LIMIT ?? "");
  const listing =
    Number.isFinite(limitEnv) && limitEnv > 0 ? fullListing.slice(0, limitEnv) : fullListing;
  if (listing.length !== fullListing.length) {
    console.log(
      `[dr-jacobs] DR_JACOBS_LIMIT set: processing ${listing.length}/${fullListing.length}`,
    );
  }

  const drafts: SupplierProductDraft[] = [];
  let detailPage = await browser.newPage();

  for (let i = 0; i < listing.length; i++) {
    const card = listing[i];
    if ((i + 1) % 20 === 0) console.log(`[dr-jacobs] ${i + 1}/${listing.length}…`);

    // The headless browser can die mid-run (OOM, or CPU/memory contention
    // with another process on the same machine) — once that happens every
    // subsequent page.goto throws "Target page, context or browser has been
    // closed" and every remaining product silently drops. Detect that and
    // relaunch a fresh browser + page, then retry this item once, instead of
    // cascading into total failure for the rest of the catalog.
    let detail: DetailData | undefined;
    for (let attempt = 0; attempt < 2 && !detail; attempt++) {
      try {
        detail = await scrapeDetail(detailPage, card.href);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const browserDied = /closed|crashed|disconnected/i.test(message);
        console.log(
          `[dr-jacobs] detail fetch failed for ${card.href} (attempt ${attempt + 1}):`,
          message,
        );
        if (browserDied && attempt === 0) {
          console.log("[dr-jacobs] browser appears dead — relaunching…");
          try {
            await browser.close();
          } catch {
            // already dead
          }
          browser = await chromium.launch();
          detailPage = await browser.newPage();
        } else if (!browserDied) {
          break; // non-browser-death error (bad page content etc.) — don't retry
        }
      }
    }
    if (!detail) continue;

    const priceGrosz = parsePriceToGrosz(card.priceText);
    if (!priceGrosz) {
      console.log(`[dr-jacobs] skip ${card.name}: no price`);
      continue;
    }

    const name = (detail.title || card.name).trim();
    const rawText = detail.descriptionText;

    const ingredientsPl = extractIngredients(rawText);
    const usageInstructionsPl = extractUsageInstructions(rawText);
    const storageInfo = extractStorageInfo(rawText);
    const disclaimer = extractStandardDisclaimer(rawText);
    const dosageLimit = extractDosageLimitWarning(rawText);
    const uwaga = extractUwagaWarning(rawText);
    const trace = extractTraceAllergenNote(rawText);
    const servingsPerContainer = extractServingsPerContainer(rawText);
    const packaging = extractPackaging(rawText);
    const benefitsPl = extractBenefits(rawText);
    const marketingDescription = extractMarketingDescription(stripBenefitLines(rawText), name);
    const shortDescPl = extractShortDesc(marketingDescription);

    const healthWarnings = [uwaga, dosageLimit, disclaimer].filter((w): w is string => Boolean(w));

    const allergenContains = ingredientsPl ? detectAllergens(ingredientsPl) : [];
    const allergenMayContain = trace.items;

    const caffeineText = `${name} ${ingredientsPl ?? ""}`;
    if (needsCaffeineWarning(caffeineText) && !healthWarnings.includes(CAFFEINE_WARNING_PL)) {
      healthWarnings.push(CAFFEINE_WARNING_PL);
    }

    // Image: prefer the full-size main product photo; fall back to the
    // listing thumbnail (upscaled) if the detail page had none.
    const imageSrc = detail.mainImageUrl ?? card.imageUrl;
    let imageUrl: string | undefined;
    if (imageSrc && !isPlaceholderImageSrc(imageSrc)) {
      const fullSizeUrl = toFullSizeImageUrl(imageSrc);
      const bytes = await downloadImage(fullSizeUrl);
      if (bytes && looksLikeRealPhoto(bytes.length)) {
        const uploaded = await uploadScrapedImage(bytes, `dr-jacobs-${card.id}.jpg`);
        imageUrl = uploaded ?? undefined;
      }
    }

    drafts.push({
      sourceId: source.id,
      externalKey: `dr-jacobs-${card.id}`,
      name,
      brandName: source.brandName,
      brandSlug: source.brandSlug,
      categoryName: card.category,
      sku: `DRJACOBS-${card.id}`,
      priceGrosz,
      vatRate: source.defaultVatRate,
      stock: 99,
      imageUrl,
      packaging,
      descriptionPl: marketingDescription || undefined,
      shortDescPl: shortDescPl || undefined,
      benefitsPl,
      ingredientsPl,
      usageInstructionsPl,
      storageInfo,
      servingsPerContainer,
      healthWarnings: healthWarnings.length > 0 ? healthWarnings : undefined,
      allergenContains: allergenContains.length > 0 ? allergenContains : undefined,
      allergenMayContain: allergenMayContain.length > 0 ? allergenMayContain : undefined,
      responsibleEntity: RESPONSIBLE_ENTITY,
      countryOfOrigin: detail.countryOfOrigin,
    });

    await new Promise((r) => setTimeout(r, 150));
  }

  await detailPage.close();
  await browser.close();

  console.log(`[dr-jacobs] done: ${drafts.length} drafts`);
  return drafts;
}
