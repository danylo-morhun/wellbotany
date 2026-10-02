import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CategoryItem, ProductListItem } from "@/features/catalog/actions";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { pluralizeProducts } from "@/lib/format";
import { sectionTitleClass } from "./SectionHeading";
import { ShelfTabs } from "./ShelfTabs";

type Tab = {
  label: string;
  slug: string;
  category: CategoryItem | null;
  products: ProductListItem[];
};

type Props = { title: string; tabs: Tab[] };

/** Tabbed seasonal shelf. Every panel is server-rendered (crawlable links);
 * the client wrapper only toggles which one is visible. */
export function SeasonalShelf({ title, tabs }: Props) {
  const filled = tabs.filter((t) => t.category && t.products.length > 0);
  if (filled.length === 0) return null;

  return (
    <section aria-labelledby="seasonal-h" className="space-y-5">
      <ShelfTabs
        heading={
          <h2 id="seasonal-h" className={sectionTitleClass}>
            {title}
          </h2>
        }
        labels={filled.map((t) => t.label)}
        panels={filled.map((t) => (
          <div key={t.slug} className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {t.products.map((p) => (
                <ProductCard key={p.id} product={p} headingLevel={3} />
              ))}
            </div>
            <div className="flex justify-center">
              <Link
                href={`/kategoria/${t.slug}`}
                className="group inline-flex h-11 items-center gap-1.5 rounded-full bg-secondary px-6 text-sm font-semibold text-secondary-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground motion-reduce:transition-none"
              >
                Zobacz wszystkie {t.category?.productCount}{" "}
                {pluralizeProducts(t.category?.productCount ?? 0)}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        ))}
      />
    </section>
  );
}
