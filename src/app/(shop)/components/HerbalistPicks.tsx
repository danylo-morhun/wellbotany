import Image from "next/image";
import Link from "next/link";
import { DiscountBadge } from "@/components/ui/discount-badge";
import type { ProductListItem } from "@/features/catalog/actions";
import { resolveDisplayBrand } from "@/features/catalog/lib/brand-tree";
import { formatPrice } from "@/lib/format";
import { discountPercent, omnibusNote, referencePrice } from "@/lib/omnibus";
import { sectionTitleClass } from "./SectionHeading";

type Props = { picks: { product: ProductListItem; note: string }[] };

/** "Zielarz poleca": a few products with the one thing to check on the label. */
export function HerbalistPicks({ picks }: Props) {
  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="picks-h" className="space-y-5">
      <div>
        <h2 id="picks-h" className={sectionTitleClass}>
          Zielarz poleca
        </h2>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          O to najczęściej pytacie przy ladzie — i na co patrzeć na etykiecie.
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-3 md:gap-5">
        {picks.map(({ product, note }) => {
          const variant = product.variants[0];
          const image = product.images[0];
          const brand = product.brand ? resolveDisplayBrand(product.brand) : null;
          const pct = variant ? discountPercent(variant) : null;
          const ref = variant ? referencePrice(variant) : null;
          const lowest = variant ? omnibusNote(variant) : null;
          return (
            <li key={product.id}>
              <Link
                href={`/produkt/${product.slug}`}
                className="group flex h-full gap-4 rounded-[1.75rem] bg-card p-4 shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-5"
              >
                <span className="relative h-36 w-24 shrink-0 md:h-40 md:w-28">
                  {image && (
                    <Image
                      src={image.url}
                      alt={image.altPl ?? [brand?.name, product.namePl].filter(Boolean).join(" ")}
                      fill
                      sizes="112px"
                      className="object-contain"
                    />
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-2">
                  <span className="rounded-2xl bg-matcha-ground px-3 py-2 text-sm font-semibold leading-snug text-matcha-ink">
                    {note}
                  </span>
                  <span className="mt-auto">
                    {brand && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {brand.name}
                      </span>
                    )}
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {product.namePl}
                    </h3>
                  </span>
                  {variant && (
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-base font-bold text-foreground">
                        {formatPrice(variant.pricePln)}
                      </span>
                      {pct != null && ref != null && (
                        <>
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(ref)}
                          </span>
                          <DiscountBadge percent={pct} />
                        </>
                      )}
                    </span>
                  )}
                  {lowest && <span className="text-xs text-muted-foreground">{lowest}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
