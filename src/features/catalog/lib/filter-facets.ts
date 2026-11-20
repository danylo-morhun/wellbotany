import type { BrandItem, CategoryItem, TagItem } from "../actions";

/**
 * Slim filter options for the client-side filter UI. Full records (images,
 * headings, sort order…) would be serialized into the RSC payload once per
 * client component — ~30 KB each on /katalog.
 */
export type FacetCategory = Pick<CategoryItem, "id" | "slug" | "namePl" | "productCount">;
export type FacetBrand = Pick<BrandItem, "id" | "slug" | "name" | "_count"> & {
  subBrands: FacetBrand[];
};
export type FacetTag = Pick<TagItem, "id" | "slug" | "namePl">;

export function toFacetCategory(c: FacetCategory): FacetCategory {
  return { id: c.id, slug: c.slug, namePl: c.namePl, productCount: c.productCount };
}

export function toFacetBrand(b: BrandItem): FacetBrand {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    _count: { products: b._count.products },
    subBrands: b.subBrands.map(toFacetBrand),
  };
}

export function toFacetTag(t: FacetTag): FacetTag {
  return { id: t.id, slug: t.slug, namePl: t.namePl };
}
