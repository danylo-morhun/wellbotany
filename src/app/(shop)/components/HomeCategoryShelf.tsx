import Link from "next/link";
import type { CategoryItem, ProductListItem } from "@/features/catalog/actions";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { SectionHeading } from "./SectionHeading";

// Two rows on phones; the rest is one tap away
const MOBILE_LIMIT = 4;

export type CategoryShelfProps = {
  id: string;
  title: string;
  lead: string;
  link: { href: string; label: string };
  products: ProductListItem[];
  /** Subcategory chips above the products */
  categories: CategoryItem[];
};

/** One part of the range in its own shelf: products round-robin from its subcategories, then links to each. */
export function HomeCategoryShelf({
  id,
  title,
  lead,
  link,
  products,
  categories,
}: CategoryShelfProps) {
  if (products.length === 0) return null;
  const headingId = `${id}-h`;

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div>
        <SectionHeading id={headingId} title={title} link={link} />
        <p className="mt-1 text-sm text-muted-foreground">{lead}</p>
      </div>
      {categories.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`Kategorie: ${link.label}`}>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/kategoria/${c.slug}`}
                className="inline-flex min-h-11 items-center rounded-full bg-card px-4 text-sm font-medium text-foreground shadow-card transition-colors hover:text-primary"
              >
                {c.namePl}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
        {products.map((p, i) => (
          // `contents` keeps each card a grid item, so a row stretches to one height
          <div key={p.id} className={i >= MOBILE_LIMIT ? "contents max-md:hidden" : "contents"}>
            <ProductCard product={p} headingLevel={3} />
          </div>
        ))}
      </div>
    </section>
  );
}
