import Fuse, { type IFuseOptions } from "fuse.js";

export type ScorableProduct = {
  namePl: string;
  slug?: string;
  shortDescPl?: string | null;
  brand?: { name: string; parentBrand?: { name: string } | null } | null;
  category?: { namePl: string } | null;
  tags?: { tag: { namePl: string } }[];
};

// Bitap-based approximate matching (fuse.js) — tolerates typos, missing
// letters, and swapped hyphen/space ("omega 3" ~ "omega-3") in one pass,
// unlike a plain-substring DB `contains` which needs an exact match.
//
// Deliberately excludes brand/category/tag names from the fuzzy keys: those
// strings repeat across dozens of unrelated products (e.g. every "BestLab"
// product, every "Sport" product), so a single loose fuzzy hit on one of
// them used to flood results with lookalikes ("testo" ~ "BestLab" ~ every
// BestLab product). Brand search is instead handled separately below as a
// strict substring match — precise enough to avoid that flooding while still
// letting "HealthLabs Care" actually find HealthLabs Care products.
const FUSE_OPTIONS: IFuseOptions<ScorableProduct> = {
  includeScore: true,
  ignoreLocation: false,
  distance: 30,
  minMatchCharLength: 3,
  threshold: 0.2,
  keys: [
    { name: "namePl", weight: 1 },
    {
      name: "slug",
      weight: 0.4,
      getFn: (p) => p.slug ?? "",
    },
    { name: "shortDescPl", weight: 0.3 },
  ],
};

/**
 * Lowercases, strips diacritics and apostrophes ("Dr. Jacob's" → "dr jacobs"),
 * and turns every other non-alphanumeric run into one space.
 */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/['’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function searchHaystack(item: ScorableProduct): string {
  return normalizeForSearch(
    [item.namePl, item.brand?.name, item.brand?.parentBrand?.name, item.slug]
      .filter(Boolean)
      .join(" "),
  );
}

/** Fuzzy-ranks items by relevance to `query`; drops items below the match threshold. */
export function rankBySearchRelevance<T extends ScorableProduct>(items: T[], query: string): T[] {
  const trimmed = query.trim();
  if (!trimmed) return items;

  const needle = trimmed.toLowerCase();
  const brandMatches = items.filter((item) => {
    const own = item.brand?.name?.toLowerCase() ?? "";
    const parent = item.brand?.parentBrand?.name?.toLowerCase() ?? "";
    return own.includes(needle) || parent.includes(needle);
  });

  // Fuse penalizes matches far from the start of a string (`distance`), so a
  // word later in the name ("Liposomalny Cynk" for "cynk") falls below the
  // threshold. An exact substring hit in the name or slug always counts.
  const nameMatches = items.filter(
    (item) =>
      item.namePl.toLowerCase().includes(needle) ||
      (item.slug ?? "").includes(needle.replace(/\s+/g, "-")),
  );

  // A query mixing brand and product words ("Dr. Jacob's Witamina") is not a
  // substring of any single field, and fuse fails on long queries. Match when
  // every query word (2+ chars) appears in name + brand + slug combined.
  const tokens = normalizeForSearch(trimmed)
    .split(" ")
    .filter((t) => t.length >= 2);
  const tokenMatches =
    tokens.length > 0
      ? items.filter((item) => {
          const haystack = searchHaystack(item);
          return tokens.every((t) => haystack.includes(t));
        })
      : [];

  const fuse = new Fuse(items, FUSE_OPTIONS);
  const fuzzyMatches = fuse.search(trimmed).map((r) => r.item);

  const seen = new Set<T>();
  const merged: T[] = [];
  for (const item of [...brandMatches, ...nameMatches, ...tokenMatches, ...fuzzyMatches]) {
    if (!seen.has(item)) {
      seen.add(item);
      merged.push(item);
    }
  }
  return merged;
}
