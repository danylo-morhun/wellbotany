import { getProducts } from "../actions";
import { parseCatalogFilters } from "../lib/filters";
import { Pagination } from "./Pagination";
import { ProductGrid } from "./ProductGrid";
import { SortSelect } from "./SortSelect";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  extraFilters: Record<string, string>;
  basePath: string;
};

// Reading searchParams and querying products both count as per-request
// (uncached) work under Cache Components — doing both inside this one
// Suspense-bounded component is what lets the rest of a /kategoria or
// /marki slug page (category/brand header, cached via "use cache") stay
// part of the static shell.
export async function CategoryProductResults({ searchParams, extraFilters, basePath }: Props) {
  const rawParams = await searchParams;
  const filters = parseCatalogFilters({ ...rawParams, ...extraFilters });
  const { items, total } = await getProducts(filters);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "produkt" : total < 5 ? "produkty" : "produktów"}
        </p>
        <SortSelect basePath={basePath} />
      </div>
      <ProductGrid products={items} />
      <Pagination filters={filters} total={total} basePath={basePath} />
    </>
  );
}
