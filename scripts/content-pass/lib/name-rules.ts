// SEO name pass — deterministic part: category hints from the old taxonomy
// and the checks every model answer must pass. Pure functions, no I/O.
import { quantities } from "./check";

export type NameOut = {
  namePl: string;
  metaTitlePl: string;
  metaDescPl: string;
  primaryCategory: string;
  extraCategories: string[];
};

export type NameProblem = { field: string; type: string; text: string };

/**
 * Old categories that already say what a non-supplement product is — the
 * primary is fixed here instead of asking the model (in the pilot it forced
 * spices and accessories into supplement types).
 */
const OLD_SLUG_PRIMARY: [RegExp, string][] = [
  [/^(przyprawy|pieprz)/, "przyprawy-i-sol"],
  [/^akcesoria/, "akcesoria"],
  [/^(ksiazki|publikacje|broszury)/, "ksiazki"],
  [/^(kawy|kawa)/, "kawa-i-herbata"],
  [/^(baton)/, "batony"],
  [/^olejki-eteryczne$/, "olejki-eteryczne"],
  [/^slodziki$/, "slodziki"],
  [/^pielegnacja-twarzy$/, "pielegnacja-twarzy"],
  [/^pielegnacja-ciala$/, "pielegnacja-ciala"],
  [/^wlosy-i-skora-glowy$/, "wlosy-i-skora-glowy"],
  [/^higiena-intymna/, "higiena-intymna-i-jamy-ustnej"],
  [/^(probiotyki-dla-zwierzat|dla-zwierzat)$/, "dla-zwierzat"],
];

export function primaryFromOldCategories(oldSlugs: string[]): string | null {
  for (const slug of oldSlugs)
    for (const [re, primary] of OLD_SLUG_PRIMARY) if (re.test(slug)) return primary;
  return null;
}

// Acronyms / symbols that stay upper-case in a name
const UPPER_OK = new Set([
  "MSM",
  "NAC",
  "DHA",
  "EPA",
  "ALA",
  "GLA",
  "MK-7",
  "MK7",
  "D3",
  "K2",
  "B1",
  "B2",
  "B3",
  "B5",
  "B6",
  "B7",
  "B9",
  "B12",
  "5-MTHF",
  "Q10",
  "SAM",
  "SAMe",
  "ADEK",
  "NAD",
  "NAD+",
  "PQQ",
  "HMB",
  "BCAA",
  "EAA",
  "GABA",
  "CBD",
  "MCT",
  "OPC",
  "DIM",
  "HCL",
  "HPMC",
  "SR",
  "IU",
  "BIO",
  "ALCAR",
  "ZMA",
  "AKG",
  "TMG",
  "CoQ10",
  "UV",
  "SPF",
  "HA",
  "II",
  "III",
]);

// A claim of any kind has no place in a meta description (the product page
// carries the EU-register wording with its conditions)
const CLAIM_WORDS = [
  "wspiera",
  "wspomaga",
  "poprawia",
  "pomaga",
  "chroni",
  "wzmacnia",
  "łagodzi",
  "redukuje",
  "obniża",
  "reguluje",
  "przyczynia",
  "działa",
  "zwiększa",
  "zmniejsza",
  "odżywia",
  "regeneruje",
  "leczy",
  "zapobiega",
  "usuwa",
  "oczyszcza",
  "spala",
  "przyspiesza",
];

// Words a name may add without them appearing in the product data: what the
// product is, its form, packaging. Matched by stem (first 5 letters).
const GENERIC_WORDS = [
  "ekstrakt",
  "ekstraktu",
  "kompleks",
  "kompleksu",
  "formuła",
  "probiotyk",
  "psychobiotyk",
  "synbiotyk",
  "prebiotyk",
  "postbiotyk",
  "suplement",
  "kapsułki",
  "kaps",
  "tabletki",
  "tabl",
  "saszetki",
  "sasz",
  "proszek",
  "proszku",
  "płyn",
  "krople",
  "kroplach",
  "żelki",
  "żelkach",
  "spray",
  "olej",
  "olejek",
  "krem",
  "serum",
  "żel",
  "maść",
  "balsam",
  "szampon",
  "tonik",
  "kawa",
  "herbata",
  "przyprawa",
  "mieszanka",
  "baton",
  "książka",
  "organizer",
  "zestaw",
  "dla",
  "dzieci",
  "kobiet",
  "mężczyzn",
  "seniorów",
  "sportowców",
  "wegański",
  "wegańskie",
  "liposomalna",
  "liposomalny",
  "liposomalne",
  "forma",
  "organiczny",
  "organiczna",
  "z",
  "i",
  "w",
  "na",
  "plus",
  "oraz",
  "typu",
  "witamina",
  "witaminy",
  "witamin",
  "minerały",
  "minerałów",
  "kwas",
  "kwasy",
  "roślinny",
  "roślinnych",
  "ziołowy",
  "ziołowa",
  "ekstraktów",
  "szt",
  "egz",
];

const WORD_SPLIT = /[\s,;:()/"'–+&-]+/;

// Packaging/form words that never count as "the product's own name"
const FORM_WORDS = [
  "kaps",
  "kapsułek",
  "kapsułki",
  "tabl",
  "tabletek",
  "sasz",
  "saszetek",
  "proszek",
  "proszku",
  "ekstrakt",
  "ekstraktu",
  "wegańskich",
  "wegańskie",
  "roślinnych",
  "suplement",
  "diety",
  "płyn",
  "krople",
  "żelek",
  "żelki",
  "sztuk",
];

function stem(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^\p{L}\d]/gu, "")
    .slice(0, 5);
}

/** Same word modulo Polish inflection: "cynk"/"cynkiem", "rybi"/"ryb". */
function sameStem(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length);
  return n >= 3 && a.slice(0, n) === b.slice(0, n);
}

/**
 * Lower-cases common words mid-name ("Kwas Hialuronowy" → "Kwas hialuronowy")
 * using the category vocabulary; trade names, acronyms and the first word
 * are left alone.
 */
export function normalizeCase(name: string, vocabulary: Set<string>): string {
  return name
    .split(" ")
    .map((word, i) => {
      if (i === 0 || !/^\p{Lu}\p{Ll}+$/u.test(word)) return word;
      return vocabulary.has(word.toLowerCase()) ? word.toLowerCase() : word;
    })
    .join(" ");
}

export function brandTokens(brand: string | null, parentBrand: string | null): string[] {
  return [brand, parentBrand]
    .filter((b): b is string => !!b)
    .flatMap((b) => [b, b.replace(/[®™.']/g, "")])
    .map((b) => b.toLowerCase().trim())
    .filter((b) => b.length >= 3);
}

function containsWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "iu").test(haystack);
}

export function checkNameOut(
  out: NameOut,
  ctx: {
    sourceText: string;
    oldName: string;
    brandTokens: string[];
    brandName: string | null;
    variantLabels: string[];
    allowedPrimary: Set<string>;
    allowedExtra: Set<string>;
    fixedPrimary: string | null;
  },
): NameProblem[] {
  const problems: NameProblem[] = [];
  const add = (field: string, type: string, text: string) => problems.push({ field, type, text });
  const name = out.namePl.trim();

  // Name
  // A brand that is itself the product's trademark ("OMNi-BiOTiC® STRESS
  // Repair") stays; a plain brand prefix ("BICAPS B2") must go
  const trademarkBrand = (token: string) =>
    new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[®™]`, "i").test(ctx.oldName);
  for (const token of ctx.brandTokens)
    if (containsWord(name, token) && !trademarkBrand(token)) add("namePl", "brand-in-name", token);
  const oldUpper = /[®™]/.test(ctx.oldName) ? new Set(ctx.oldName.split(/\s+/)) : new Set<string>();
  for (const word of name.split(/[\s–/(),+]+/)) {
    const bare = word.replace(/[®™]/g, "");
    const letters = bare.replace(/[^\p{L}]/gu, "");
    if (
      letters.length >= 4 &&
      letters === letters.toUpperCase() &&
      !UPPER_OK.has(bare) &&
      !oldUpper.has(word)
    ) {
      // Trademarks keep their spelling ("BIOPERINE®")
      if (!/[®™]/.test(word)) add("namePl", "all-caps", word);
    }
  }
  if (/\s-\s/.test(name)) add("namePl", "hyphen-dash", "use ' – '");
  if (/\s{2,}/.test(name)) add("namePl", "double-space", name);
  if (name.length > 90) add("namePl", "too-long", String(name.length));
  if (/nowość|promocja|hit\b/i.test(name)) add("namePl", "marketing-word", name);

  // Every word must be traceable to the product data (or be a generic
  // "what it is" word) — catches invented forms ("mielony" for whole cloves)
  // and mangled trade names ("CynoZinc" for CarnoZinc)
  const sourceStems = [...new Set(ctx.sourceText.split(WORD_SPLIT).map(stem))].filter(
    (w) => w.length >= 2,
  );
  const genericStems = GENERIC_WORDS.map(stem);
  for (const word of name.split(WORD_SPLIT)) {
    const st = stem(word);
    if (st.length < 3 || /^\d/.test(st)) continue;
    const known = [...sourceStems, ...genericStems].some((s) => sameStem(s, st));
    if (!known) add("namePl", "new-word", word);
  }
  // The product's own name must survive: at least one distinctive word of
  // the old name ("Senior", "Boswellia") stays, unless it was a pure brand
  const brandish = (w: string) => ctx.brandTokens.some((b) => b.includes(w.toLowerCase()));
  const oldCore = ctx.oldName
    .split(WORD_SPLIT)
    .map((w) => w.replace(/[®™]/g, ""))
    .filter(
      (w) =>
        /\p{L}{4,}/u.test(w) && !brandish(w) && !FORM_WORDS.some((f) => sameStem(stem(f), stem(w))),
    );
  const newStems = name.split(WORD_SPLIT).map(stem);
  if (oldCore.length > 0 && !oldCore.some((w) => newStems.some((n) => sameStem(n, stem(w)))))
    add("namePl", "name-lost", oldCore.join(" "));
  // Trade names from the old name (CamelCase or ®/™) must survive intact
  for (const word of ctx.oldName.split(/\s+/)) {
    const bare = word.replace(/[()"',]/g, "");
    const isTradeName = /[®™]/.test(bare) || /\p{Ll}\p{Lu}/u.test(bare);
    if (!isTradeName) continue;
    if (ctx.brandTokens.some((b) => bare.toLowerCase().replace(/[®™]/g, "").includes(b))) continue;
    if (!name.toLowerCase().includes(bare.replace(/[®™]/g, "").toLowerCase()))
      add("namePl", "trade-name-changed", bare);
  }
  if (ctx.variantLabels.length > 1)
    for (const label of ctx.variantLabels)
      for (const q of quantities(label))
        if (quantities(name).includes(q)) add("namePl", "pack-size-in-group-name", q);

  // Numbers must come from the product's own data
  // "90 kaps." in the data may be written as "90 sztuk" in prose
  const known = new Set(
    quantities(ctx.sourceText).flatMap((q) =>
      /(kaps|tabl|sasz)$/.test(q) ? [q, q.replace(/\S+$/, "szt")] : [q],
    ),
  );
  for (const field of ["namePl", "metaTitlePl", "metaDescPl"] as const)
    for (const q of quantities(out[field])) if (!known.has(q)) add(field, "unsourced-number", q);

  // Meta
  const title = out.metaTitlePl.trim();
  if (title.length > 60) add("metaTitlePl", "too-long", String(title.length));
  if (/well botany/i.test(title)) add("metaTitlePl", "site-name", title);
  if (ctx.brandName && !containsWord(title, ctx.brandName)) add("metaTitlePl", "no-brand", title);
  const desc = out.metaDescPl.trim();
  // Google shows ~155 chars; a short but factual one beats a padded one
  if (desc.length < 80 || desc.length > 165) add("metaDescPl", "length", String(desc.length));
  const lowerDesc = desc.toLowerCase();
  for (const w of CLAIM_WORDS) if (containsWord(lowerDesc, w)) add("metaDescPl", "claim", w);

  // Categories
  if (ctx.fixedPrimary && out.primaryCategory !== ctx.fixedPrimary)
    add("primaryCategory", "fixed-primary", ctx.fixedPrimary);
  if (!ctx.allowedPrimary.has(out.primaryCategory))
    add("primaryCategory", "unknown", out.primaryCategory);
  for (const slug of out.extraCategories)
    if (!ctx.allowedExtra.has(slug) || slug === out.primaryCategory)
      add("extraCategories", "invalid", slug);

  return problems;
}
