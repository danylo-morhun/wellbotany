import Link from "next/link";
import type { ProductListItem } from "@/features/catalog/actions";
import { ProductCard } from "@/features/catalog/components/ProductCard";

type Props = {
  products: ProductListItem[];
  title: string;
  href: string;
  variant?: "grid" | "scroll";
};

export function BestsellerRow({ products, title, href, variant = "grid" }: Props) {
  if (products.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-balance font-heading text-2xl font-bold tracking-tight">{title}</h2>
        <Link
          href={href}
          className="group rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground motion-reduce:transition-none"
        >
          Zobacz wszystkie
          <span className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0">
            →
          </span>
        </Link>
      </div>

      {variant === "scroll" ? (
        <div className="-mx-4 px-4 md:-mx-0 md:px-0">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((p, index) => (
              <div key={p.id} className="w-[200px] shrink-0 snap-start sm:w-[220px]">
                <ProductCard product={p} priority={index < 4} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p, index) => (
            <ProductCard key={p.id} product={p} priority={index < 4} />
          ))}
        </div>
      )}
    </section>
  );
}
