import type { ProductListItem } from "@/features/catalog/actions";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { SectionHeading } from "./SectionHeading";

type Props = {
  id: string;
  products: ProductListItem[];
  title: string;
  href: string;
  variant?: "grid" | "scroll";
};

export function BestsellerRow({ id, products, title, href, variant = "grid" }: Props) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby={id} className="space-y-4">
      <SectionHeading id={id} title={title} link={{ href, label: "Zobacz wszystkie" }} />

      {variant === "scroll" ? (
        <div className="-mx-4 px-4 md:-mx-0 md:px-0">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((p, index) => (
              <div key={p.id} className="w-[200px] shrink-0 snap-start sm:w-[220px]">
                <ProductCard product={p} priority={index < 4} headingLevel={3} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {products.map((p, index) => (
            <ProductCard key={p.id} product={p} priority={index < 4} headingLevel={3} />
          ))}
        </div>
      )}
    </section>
  );
}
