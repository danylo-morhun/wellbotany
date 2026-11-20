import {
  applyBrandFacetCounts,
  getBrandFacetCounts,
  getBrands,
  getCategories,
  getCategoryFacetCounts,
  getTags,
  resolveCatalogFilters,
} from "../actions";
import { toFacetBrand, toFacetCategory, toFacetTag } from "../lib/filter-facets";
import { FilterDrawerButton } from "./FilterDrawerButton";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  categoryOverride?: string;
  brandOverride?: string;
  basePath?: string;
  showCategories?: boolean;
};

/** Same scoped-counts resolution as `FilterSidebarData`, for the mobile drawer trigger — see that file for why this is `cache()`d rather than duplicating the queries. */
export async function FilterDrawerButtonData({
  searchParams,
  categoryOverride,
  brandOverride,
  basePath,
  showCategories = true,
}: Props) {
  const filters = await resolveCatalogFilters(searchParams, categoryOverride, brandOverride);
  const [categories, brands, tags, categoryCounts, brandCounts] = await Promise.all([
    getCategories(),
    getBrands(),
    getTags(),
    getCategoryFacetCounts(filters),
    getBrandFacetCounts(filters),
  ]);

  const scopedCategories = showCategories
    ? categories.map((c) => toFacetCategory({ ...c, productCount: categoryCounts.get(c.id) ?? 0 }))
    : [];
  const scopedBrands = applyBrandFacetCounts(brands, brandCounts).map(toFacetBrand);

  return (
    <FilterDrawerButton
      categories={scopedCategories}
      brands={scopedBrands}
      tags={tags.map(toFacetTag)}
      basePath={basePath}
      impliedCategory={categoryOverride}
      impliedBrand={brandOverride}
    />
  );
}
