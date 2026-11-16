import type { ProductListItem } from "@/features/catalog/actions";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { SectionHeading } from "./SectionHeading";

// Two rows on phones; the rest is one tap away
const MOBILE_LIMIT = 4;

type Props = { products: ProductListItem[] };

/** Biggest real reductions first. Each card carries its own Omnibus note. */
export function HomeDeals({ products }: Props) {
  if (products.length === 0) return null;

  return (
    <section id="teraz-taniej" aria-labelledby="deals-h" className="scroll-mt-24 space-y-4">
      <div>
        <SectionHeading
          id="deals-h"
          title="Teraz taniej"
          link={{ href: "/katalog?promocje=1", label: "Wszystkie promocje" }}
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Przy każdej cenie podajemy najniższą cenę z 30 dni przed obniżką.
        </p>
      </div>
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
