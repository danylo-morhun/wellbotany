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
const FUSE_OPTIONS: IFuseOptions<ScorableProduct> = {
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
  threshold: 0.4,
  keys: [
    { name: "namePl", weight: 1 },
    {
      name: "slug",
      weight: 0.4,
      getFn: (p) => p.slug ?? "",
    },
    {
      name: "brandName",
      weight: 0.6,
      getFn: (p) => p.brand?.name ?? "",
    },
    {
      name: "categoryName",
      weight: 0.5,
      getFn: (p) => p.category?.namePl ?? "",
    },
    {
      name: "tagNames",
      weight: 0.5,
      getFn: (p) => p.tags?.map((t) => t.tag.namePl).join(" ") ?? "",
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
