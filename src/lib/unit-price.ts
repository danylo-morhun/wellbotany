// Unit price (cena jednostkowa) — required next to the price by art. 4 of the
// ustawa o informowaniu o cenach towarów i usług; units per § 4 of the
// rozporządzenie of 19.12.2022 (Dz.U. 2022 poz. 2776): per kg / litre for
// goods sold by mass / volume, per piece for packaged goods labelled with a
// piece count (capsules, tablets, sachets). Not required when it equals the
// price (a single piece). Quantities come from the variant's optionValue or
// the product's netWeight; anything ambiguous yields null — never guessed.
import { formatPrice } from "./format";

export type PackQuantity = { value: number; unit: "g" | "ml" | "ct" };

// Longest alternatives first; each maps to a base unit and multiplier
const UNITS: [RegExp, PackQuantity["unit"], number][] = [
  [/^(kg|kilogram(?:ów|y|a)?)/, "g", 1000],
  [/^(g|gr|gram(?:ów|y|a)?)(?![a-ząćęłńóśźż])/, "g", 1],
  [/^(ml|mililitr(?:ów|y|a)?)/, "ml", 1],
  [/^(l|litr(?:ów|y|a)?)(?![a-ząćęłńóśźż])/, "ml", 1000],
  [
    /^(kaps(?:ułek|ułki|ułka|\.)?|kpas\.|tabl(?:etek|etki|etka|\.)?|tab\.|sasz(?:etek|etki|etka|\.)?|szt(?:uk|uki|\.)?|żel(?:ek|ków|ki)|pastyl(?:ek|ki|\.)|drażetek|ampułek|ampułki|egz\.)/,
    "ct",
    1,
  ],
];

// Thousands may be grouped with a space or a no-break space: "1 000 ml"
const NUMBER = /^(\d{1,3}(?:[ \u00a0]\d{3})+|\d+(?:[.,]\d+)?)/;

function readNumber(text: string): [number, string] | null {
  const m = NUMBER.exec(text);
  if (!m) return null;
  return [Number(m[1].replace(/[ \u00a0]/g, "").replace(",", ".")), text.slice(m[0].length)];
}

/**
 * "60 kaps.", "300 g", "0,5 l", "2x 60 kaps.", "300 g (30 sasz. x 10 g)" →
 * quantity; anything else (several quantities, drops, portions, "Słoik") → null.
 */
export function parsePackQuantity(raw: string | null | undefined): PackQuantity | null {
  if (!raw) return null;
  let rest = raw
    .trim()
    .toLowerCase()
    // "Słoik (300 g)" → "300 g"; trailing "." / "," is punctuation, not data
    .replace(/^(?:słoik|tuba|butelka|puszka|opakowanie)\s*\((.+)\)$/, "$1")
    .replace(/,$/, "")
    .replace(/\b(k?g|ml|l)\.$/, "$1");
  const first = readNumber(rest);
  if (!first) return null;
  let [value] = first;
  rest = first[1].trimStart();
  // Multipack: "2x 60 kaps.", "2 x 30 sasz."
  const multi = /^[x×]\s*/.exec(rest);
  if (multi) {
    const second = readNumber(rest.slice(multi[0].length));
    if (!second) return null;
    value *= second[0];
    rest = second[1].trimStart();
  }
  for (const [pattern, unit, factor] of UNITS) {
    const m = pattern.exec(rest);
    if (!m) continue;
    const tail = rest.slice(m[0].length).trim();
    // Only a parenthetical detail or a " – note" may follow; a second
    // quantity ("/ 250 g", "+ 30 sasz.") makes the pack ambiguous
    if (tail && !/^(\(.*\)|[-–—]\s.*)$/.test(tail)) return null;
    const total = value * factor;
    return total > 0 ? { value: total, unit } : null;
  }
  return null;
}

/**
 * Quantity of one variant: its own option value; for the only variant, the
 * piece count closing the product name ("… – 60 kaps.") before the net
 * weight — capsules compare per piece, not per kg of capsule mass.
 */
export function variantPackQuantity(
  optionValue: string | null | undefined,
  netWeight: string | null | undefined,
  isOnlyVariant: boolean,
  productName?: string,
): PackQuantity | null {
  const own = parsePackQuantity(optionValue);
  if (own || !isOnlyVariant) return own;
  const tail = productName && /[–,]\s*([^–,]+)$/.exec(productName)?.[1];
  const fromName = parsePackQuantity(tail);
  return fromName?.unit === "ct" ? fromName : parsePackQuantity(netWeight);
}

const BASE = {
  g: { amount: 1000, label: "kg" },
  ml: { amount: 1000, label: "l" },
  ct: { amount: 1, label: "szt." },
};

/** "0,83 zł / szt.", "245,00 zł / kg" — null when not required (single piece) or unknown. */
export function formatUnitPrice(pricePln: number, quantity: PackQuantity | null): string | null {
  if (!quantity || (quantity.unit === "ct" && quantity.value === 1)) return null;
  const base = BASE[quantity.unit];
  const perBase = Math.round((pricePln * base.amount) / quantity.value);
  return `${formatPrice(perBase)} / ${base.label}`;
}

/** g:unit_pricing_measure / g:unit_pricing_base_measure for the Merchant Center feed. */
export function feedUnitPricing(
  quantity: PackQuantity | null,
): { measure: string; base: string } | null {
  if (!quantity || (quantity.unit === "ct" && quantity.value === 1)) return null;
  const value = Number(quantity.value.toFixed(2));
  if (quantity.unit === "g") return { measure: `${value}g`, base: "1kg" };
  if (quantity.unit === "ml") return { measure: `${value}ml`, base: "1l" };
  return { measure: `${value}ct`, base: "1ct" };
}
