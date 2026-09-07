/**
 * Shared helpers for web-scraper suppliers (parsers that hit a live site with
 * Playwright instead of parsing a price-list file). Every function here exists
 * because the Singularis import hit the mistake it guards against — see
 * `.claude/skills/import-supplier/SKILL.md` for the full writeup of each one.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a scraped image to Cloudinary (the same unsigned preset the admin's
 * CloudinaryDropzone uses) instead of saving it under `public/`. Anything
 * under `public/supplier-images/` is .gitignored and never reaches
 * production — Cloudinary URLs are external and need no deploy step.
 */
export async function uploadScrapedImage(
  imageBytes: Buffer,
  filename: string,
): Promise<string | null> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) return null;

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(imageBytes)]), filename);
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) return null;

  const { secure_url } = (await res.json()) as { secure_url: string };
  // f_auto/q_auto: modern format + compression at the URL level (Next's own
  // optimizer is off — see next.config.ts `unoptimized: true` comment).
  return secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
}

/**
 * WooCommerce (and most WP-based shops) serve listing thumbnails as
 * `name-250x250.jpg` and the full packshot at the same path minus that
 * suffix. Singularis' listing images were 8KB thumbnails; stripping this
 * suffix got 250-300KB originals from the *same* URL — no extra request
 * needed to discover it.
 */
export function toFullSizeImageUrl(thumbnailUrl: string): string {
  return thumbnailUrl.replace(/-\d+x\d+(\.\w+)$/, "$1");
}

/**
 * Many themes lazy-load listing images: `<img src>` holds a placeholder
 * (`data:image/svg+xml;base64,...`) and the real URL sits in `data-src` /
 * `data-lazy-src`. Reading `.src` directly silently downloads the same grey
 * placeholder for every product. Always prefer the lazy-load attribute.
 */
export function isPlaceholderImageSrc(src: string | null | undefined): boolean {
  return !src || src.startsWith("data:");
}

/**
 * A downloaded "photo" this small is a placeholder or a broken/blocked
 * fetch, not a usable packshot — reject before uploading it as the product's
 * main image. Real WooCommerce originals ran 150KB-300KB; broken fetches and
 * grey placeholders were consistently under ~10KB.
 */
export function looksLikeRealPhoto(byteLength: number, minBytes = 15_000): boolean {
  return byteLength >= minBytes;
}

/**
 * Guards against silent language contamination: an AI-assisted rewrite step
 * (e.g. polishing a `benefitsPl` bullet) can drift into Cyrillic if the model
 * was primed in Russian/Ukrainian earlier in the same session. Run this on
 * every AI-touched Polish field before saving — never on scraped supplier
 * text, which is trusted verbatim.
 */
export function containsCyrillic(text: string): boolean {
  return /[а-яёіїєґ]/i.test(text);
}

/** EU Regulation 1169/2011 Annex II — the 14 allergen groups that must be
 *  declared (and visually emphasized) whenever present in the ingredient
 *  list. Polish stems, lowercase, matched as substrings against the raw
 *  ingredients text scraped from the supplier's own label copy. */
export const EU_ALLERGEN_TERMS_PL: Record<string, string> = {
  gluten: "Gluten",
  pszenic: "Gluten (pszenica)",
  żyto: "Gluten (żyto)",
  jęczmi: "Gluten (jęczmień)",
  owies: "Gluten (owies)",
  skorupiak: "Skorupiaki",
  jaj: "Jaja",
  ryb: "Ryby",
  orzeszk: "Orzeszki ziemne",
  soj: "Soja",
  mlek: "Mleko",
  laktoz: "Mleko (laktoza)",
  orzech: "Orzechy",
  seler: "Seler",
  gorczyc: "Gorczyca",
  sezam: "Nasiona sezamu",
  siarczyn: "Dwutlenek siarki i siarczyny",
  łubin: "Łubin",
  mięcz: "Mięczaki",
};

/**
 * Scan a raw ingredients string for EU Annex II allergen terms. This is a
 * detector, not a certifier — a product that comes back empty may still need
 * a human to confirm "brak alergenów" is correct rather than a missed term;
 * a non-empty result must always be carried into `allergenContains`, never
 * silently dropped (Art. 9(1)(c) makes this a compliance requirement, not a
 * nice-to-have — see the skill's legal-fields checklist).
 */
export function detectAllergens(ingredientsText: string): string[] {
  const lower = ingredientsText.toLowerCase();
  const found = new Set<string>();
  for (const [term, label] of Object.entries(EU_ALLERGEN_TERMS_PL)) {
    if (lower.includes(term)) found.add(label);
  }
  return [...found];
}

/**
 * Products with meaningful caffeine (guarana, kofeina, yerba mate, green
 * tea/coffee extracts above trace amounts) require the Annex III mandatory
 * warning. Detect by name/ingredients so the runner can flag any product
 * that has the stimulant but is missing the warning text, rather than
 * silently shipping without it.
 */
export function needsCaffeineWarning(nameOrIngredients: string): boolean {
  return /guarana|kofein|kofeina|yerba\s*mate|green\s*coffee|zielon[ae]\s*kaw/i.test(
    nameOrIngredients,
  );
}

export const CAFFEINE_WARNING_PL =
  "Wysoka zawartość kofeiny. Niewskazane dla dzieci oraz kobiet w ciąży i karmiących piersią.";

/**
 * Normalize a name for matching a listing-page row back to its detail-page
 * URL, or a scraped item back to an existing draft/DB record. Whitespace and
 * case differences between the two DOM reads (listing vs. detail page title)
 * are common enough that a plain `===` silently drops matches.
 */
export function normalizeProductName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}
