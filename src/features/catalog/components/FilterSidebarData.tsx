import {
  getBrandFacetCounts,
  getBrands,
  getCategories,
  getCategoryFacetCounts,
  getTags,
  resolveCatalogFilters,
} from "../actions";
import { FilterSidebar } from "./FilterSidebar";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  categoryOverride?: string;
  basePath?: string;
  showCategories?: boolean;
};

/** Resolves category/brand product counts scoped to the currently active filters, then renders `FilterSidebar` — kept in its own component so the per-request facet-count queries stay confined to a Suspense boundary. */
export async function FilterSidebarData({
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
    <FilterSidebar
      categories={scopedCategories}
      brands={scopedBrands}
      tags={tags}
      basePath={basePath}
      impliedCategory={categoryOverride}
    />
  );
}
