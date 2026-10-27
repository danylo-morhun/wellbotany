import Image from "next/image";
import Link from "next/link";
import type { CategoryItem } from "@/features/catalog/actions";
import { pluralizeProducts } from "@/lib/format";
import { SectionHeading } from "./SectionHeading";

type Props = {
  tiles: { category: CategoryItem; image: { url: string; altPl: string | null } }[];
};

/** Ingredient categories, each pictured by one of its products' packshots. */
export function IngredientTiles({ tiles }: Props) {
  if (tiles.length === 0) return null;

  return (
    // Phones already get the top ingredients as chips under the header search
    <section aria-labelledby="ingredients-h" className="space-y-4 max-md:hidden">
      <SectionHeading
        id="ingredients-h"
        title="Popularne składniki"
        link={{ href: "/kategorie", label: "Wszystkie" }}
      />
      {/* Two rows of four: shares its band with the brand wall on desktop */}
      <ul className="grid grid-cols-8 gap-3 lg:grid-cols-4">
        {tiles.map(({ category, image }) => (
          <li key={category.id}>
            <Link
              href={`/kategoria/${category.slug}`}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <span className="relative block aspect-square w-full rounded-2xl bg-card shadow-card transition-[box-shadow,transform] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-card-hover motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                {/* Inset rounded frame, same as ProductCard */}
                <span className="absolute inset-2 overflow-hidden rounded-xl md:inset-2.5">
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 12vw, 120px"
                    className="object-contain"
                  />
                </span>
              </span>
              <span className="text-xs font-semibold leading-tight text-foreground group-hover:text-primary sm:text-sm">
                {category.namePl}
              </span>
              <span className="-mt-1.5 hidden text-xs text-muted-foreground sm:block">
                {category.productCount} {pluralizeProducts(category.productCount)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
