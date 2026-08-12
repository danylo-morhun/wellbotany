import Fuse, { type IFuseOptions } from "fuse.js";

export type ScorableProduct = {
  namePl: string;
  slug?: string;
  shortDescPl?: string | null;
  brand?: { name: string } | null;
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
// BestLab product) — brand/category already have dedicated filters for
// exact matching, so they don't need fuzzy free-text search too.
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

/** Fuzzy-ranks items by relevance to `query`; drops items below the match threshold. */
export function rankBySearchRelevance<T extends ScorableProduct>(items: T[], query: string): T[] {
  const trimmed = query.trim();
  if (!trimmed) return items;
  const fuse = new Fuse(items, FUSE_OPTIONS);
  return fuse.search(trimmed).map((r) => r.item);
}
