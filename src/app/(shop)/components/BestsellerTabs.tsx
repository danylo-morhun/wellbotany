import type { ProductListItem } from "@/features/catalog/actions";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { HomeTabs } from "./HomeTabs";
import { sectionTitleClass } from "./SectionHeading";

type Props = {
  tabs: { id: string; label: string; href: string; products: ProductListItem[] }[];
  /** First shelf on the page: the H1 above already names it, so the h2 is for screen readers */
  lead?: boolean;
};

/** One product row, switched by tab (Polecane + the biggest needs). Four cards:
 * one row on desktop, 2×2 on phones. */
export function BestsellerTabs({ tabs, lead = false }: Props) {
  if (tabs.length === 0) return null;

  return (
    <section aria-labelledby="featured-h" className="space-y-4">
      <h2 id="featured-h" className={lead ? "sr-only" : sectionTitleClass}>
        Polecane produkty
      </h2>
      <HomeTabs
        label="Polecane produkty"
        tabs={tabs.map((tab, tabIndex) => ({
          id: tab.id,
          label: tab.label,
          link: { href: tab.href, label: "Zobacz wszystkie" },
          panel: (
            // Cards are direct grid items so every card in the row stretches to one height
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
              {tab.products.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  // First visible row only: eager-load its images
                  priority={tabIndex === 0 && i < (lead ? 4 : 2)}
                  headingLevel={3}
                />
              ))}
            </div>
          ),
        }))}
      />
    </section>
  );
}
