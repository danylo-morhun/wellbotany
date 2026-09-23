// Deterministic safety net for AI-written product content. Pure: text in,
// problems out. Complements the AI verifier — numbers, codes and formats are
// where a script is more reliable than a model.

export type Problem = { field: string; type: string; text: string };

const ALLOWED_TAGS = new Set(["h2", "h3", "p", "ul", "li", "strong"]);
const BANNED = [
  "leczy",
  "leczenie",
  "zwalcza",
  "usuwa",
  "likwiduje",
  "zapobiega",
  "gwarantuje",
  "cudown",
  "100% skuteczn",
  "detoksyk",
  "oczyszcza organizm",
  "spala tłuszcz",
  "antywirus",
  "przeciwnowotwor",
  "na raka",
  "uzdrawia",
];

/** "2 000 IU" / "2000IU" / "0,5 g" / "µg"=="mcg"=="ug" → comparable tokens. */
export function quantities(text: string): string[] {
  const t = text
    .toLowerCase()
    // "2 000" → "2000", but not "B6 120" / "D3 800" (a digit glued to a letter)
    .replace(/(?<![a-z\d.,])(\d{1,3})[\s\u00a0](?=\d{3}\b)/g, "$1")
    // CFU counts: "2,6×10⁹", "2x10^9", "2 miliardy" → "2.6 mld"
    .replace(/(\d+(?:[.,]\d+)?)\s*[x×]\s*10(?:⁹|\^9)/g, "$1 mld")
    .replace(/(\d+(?:[.,]\d+)?)\s*miliard\w*/g, "$1 mld");
  const re =
    /(\d+(?:[.,]\d+)?)\s*(mg|g|kg|µg|μg|mcg|ug|iu|j\.?\s?m\.?|ml|l|kaps|kapsułek|kapsułki|capsules?|tabl|tabletek|tablets?|%|mld|cfu|kcal|kj|sasz|szt)(?![a-ząćęłńóśźż])/g;
  const unit = (u: string) =>
    u
      .replace(/^(µg|μg|mcg|ug)$/, "µg")
      .replace(/^j\.?\s?m\.?$/, "iu")
      .replace(/^(kaps|capsule).*/, "kaps")
      .replace(/^(tabl|tablet).*/, "tabl")
      .replace(/^sasz.*/, "sasz");
  return [...t.matchAll(re)].map((m) => `${m[1].replace(",", ".")} ${unit(m[2])}`);
}

/** GTIN-8/12/13/14 check digit (EAN-13, UPC-A, …). */
export function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop() as number;
  // Weights run 3,1,3,… starting from the digit next to the check digit
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === check;
}

type ProductOut = Record<string, unknown> & { id: string };

export function checkProduct(
  out: ProductOut,
  sourceText: string,
  trustedText: string,
  categorySlugs: Set<string>,
): Problem[] {
  const problems: Problem[] = [];
  // "2,250 µg" in an English label is 2250 — accept both readings of a comma
  const known = new Set(
    quantities(`${sourceText}\n${trustedText}`).flatMap((q) =>
      /^\d+\.\d{3} /.test(q) ? [q, q.replace(".", "")] : [q],
    ),
  );
  const textFields = Object.entries(out).filter(
    ([k]) => !["id", "primaryCategory", "extraCategories"].includes(k),
  );
  for (const [field, value] of textFields) {
    if (value == null) continue;
    const text = typeof value === "string" ? value : JSON.stringify(value);
    // "1–2 kapsułki" is sourced when the source has the same range ("1-2 dziennie")
    const ranges = new Set(
      [...text.matchAll(/(\d+)\s*[-–]\s*(\d+)/g)]
        .filter(([, a, b]) => new RegExp(`\\b${a}\\s*[-–]\\s*${b}\\b`).test(sourceText))
        .map(([, , b]) => b),
    );
    for (const q of quantities(text)) {
      if (!known.has(q) && !ranges.has(q.split(" ")[0]))
        problems.push({ field, type: "unsourced-number", text: q });
    }
    const lower = text.toLowerCase();
    for (const word of BANNED)
      if (lower.includes(word)) problems.push({ field, type: "banned-word", text: word });
  }
  const html = typeof out.descriptionPl === "string" ? out.descriptionPl : "";
  for (const m of html.matchAll(/<([a-z0-9]+)/gi)) {
    if (!ALLOWED_TAGS.has(m[1].toLowerCase()))
      problems.push({ field: "descriptionPl", type: "html-tag", text: m[1] });
  }
  const title = typeof out.metaTitlePl === "string" ? out.metaTitlePl : "";
  if (title.length > 60)
    problems.push({ field: "metaTitlePl", type: "length", text: `${title.length} > 60` });
  const desc = typeof out.metaDescPl === "string" ? out.metaDescPl : "";
  if (desc && (desc.length < 120 || desc.length > 160))
    problems.push({ field: "metaDescPl", type: "length", text: `${desc.length} not in 120–160` });
  const cats = [out.primaryCategory, ...((out.extraCategories as string[] | null) ?? [])].filter(
    Boolean,
  ) as string[];
  for (const slug of cats)
    if (!categorySlugs.has(slug))
      problems.push({ field: "categories", type: "unknown-slug", text: slug });
  return problems;
}
