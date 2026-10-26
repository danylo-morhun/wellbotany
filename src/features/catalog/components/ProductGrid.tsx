import Link from "next/link";
import type { ProductListItem } from "../actions";
import { ProductCard } from "./ProductCard";

type Props = {
  products: ProductListItem[];
  /** Search text to echo back when nothing matches */
  query?: string;
  /** Listing without filters — the way out of an empty result */
  clearHref?: string;
};

export function ProductGrid({ products, query, clearHref }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-foreground">
          {query ? `Brak produktów dla „${query}”` : "Brak produktów"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Zmień filtry lub wróć do pełnego katalogu.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {clearHref && (
            <Link
              href={clearHref}
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
            >
              Wyczyść filtry
            </Link>
          )}
          <Link
            href="/kategorie"
            className="inline-flex min-h-11 items-center rounded-full bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            Przeglądaj kategorie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}
