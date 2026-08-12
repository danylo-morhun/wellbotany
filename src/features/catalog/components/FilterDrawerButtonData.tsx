import {
  getBrandFacetCounts,
  getBrands,
  getCategories,
  getCategoryFacetCounts,
  getTags,
  resolveCatalogFilters,
} from "../actions";
import { FilterDrawerButton } from "./FilterDrawerButton";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  categoryOverride?: string;
  basePath?: string;
  showCategories?: boolean;
};

/** Same scoped-counts resolution as `FilterSidebarData`, for the mobile drawer trigger — see that file for why this is `cache()`d rather than duplicating the queries. */
export async function FilterDrawerButtonData({
  searchParams,
  categoryOverride,
  basePath,
  showCategories = true,
}: Props) {
  const filters = await resolveCatalogFilters(searchParams, categoryOverride);
  const [categories, brands, tags, categoryCounts, brandCounts] = await Promise.all([
    getCategories(),
    getBrands(),
    getTags(),
    getCategoryFacetCounts(filters),
    getBrandFacetCounts(filters),
  ]);

  const scopedCategories = showCategories
    ? categories.map((c) => ({ ...c, _count: { products: categoryCounts.get(c.id) ?? 0 } }))
    : [];
  const scopedBrands = brands.map((b) => ({
    ...b,
    _count: { products: brandCounts.get(b.id) ?? 0 },
  }));

  return (
    <FilterDrawerButton
      categories={scopedCategories}
      brands={scopedBrands}
      tags={tags}
      basePath={basePath}
    />
  );
}
