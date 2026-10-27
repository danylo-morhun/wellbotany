import type { ProductListItem } from "@/features/catalog/actions";
import { HomeProductRow } from "./HomeProductRow";
import { SectionHeading } from "./SectionHeading";

const MOBILE_LIMIT = 4;

type Props = { products: ProductListItem[] };

/** Dense list of small cards: new arrivals are for scanning, not a second shelf. */
export function HomeNewArrivals({ products }: Props) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="new-h" className="space-y-4">
      <SectionHeading
        id="new-h"
        title="Nowości"
        link={{ href: "/katalog?nowosci=1", label: "Zobacz wszystkie" }}
      />
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {products.map((p, i) => (
          <li key={p.id} className={i >= MOBILE_LIMIT ? "max-sm:hidden" : undefined}>
            <HomeProductRow product={p} badge="new" />
          </li>
        ))}
      </ul>
    </section>
  );
}
