import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CategoryItem, ProductListItem } from "@/features/catalog/actions";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { pluralizeProducts } from "@/lib/format";
import { sectionTitleClass } from "./SectionHeading";

type Props = {
  title: string;
  categories: { label: string; slug: string; category: CategoryItem }[];
  products: ProductListItem[];
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function listPl(items: string[]) {
  return items.length < 2
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;
}

/** Seasonal pick: an editorial lead block beside a few products from the
 * season's categories. One "see all" link — the need shortcuts above already
 * offer the full choice of categories. */
export function SeasonalShelf({ title, categories, products }: Props) {
  const main = categories[0];
  if (!main || products.length === 0) return null;

  return (
    <section aria-labelledby="seasonal-h" className="grid gap-6 lg:grid-cols-6 lg:gap-4">
      <div className="flex flex-col items-start gap-4 lg:col-span-2 lg:justify-center lg:pr-10">
        <h2 id="seasonal-h" className={sectionTitleClass}>
          {title}
        </h2>
        <p className="max-w-prose text-secondary-foreground">
          Wybór z kategorii {listPl(categories.map((c) => lowerFirst(c.label)))}. Przy każdym
          produkcie podajemy pełny skład i dawkę w porcji.
        </p>
        <Link
          href={`/kategoria/${main.slug}`}
          className="group inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 hover:bg-primary-deep active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Zobacz {main.category.productCount} {pluralizeProducts(main.category.productCount)}{" "}
          {lowerFirst(main.category.namePl)}
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            aria-hidden
          />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:col-span-4">
        {products.map((p, i) => (
          // Phones: one row of two keeps the band short; the CTA leads to the rest
          <div key={p.id} className={i >= 2 ? "max-md:hidden md:contents" : "contents"}>
            <ProductCard product={p} headingLevel={3} />
          </div>
        ))}
      </div>
    </section>
  );
}
