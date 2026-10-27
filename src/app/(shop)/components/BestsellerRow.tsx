import type { ProductListItem } from "@/features/catalog/actions";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { SectionHeading } from "./SectionHeading";

type Props = {
  id: string;
  products: ProductListItem[];
  title: string;
  href: string;
  /** Only the first row on the page: eager-load its first images (LCP) */
  priority?: boolean;
};

/** The homepage's one standard product grid (Polecane). */
export function BestsellerRow({ id, products, title, href, priority = false }: Props) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={id} className="space-y-4">
      <SectionHeading id={id} title={title} link={{ href, label: "Zobacz wszystkie" }} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {products.map((p, index) => (
          <ProductCard key={p.id} product={p} priority={priority && index < 4} headingLevel={3} />
        ))}
      </div>
    </section>
  );
}
