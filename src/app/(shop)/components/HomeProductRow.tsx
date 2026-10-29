import Image from "next/image";
import Link from "next/link";
import { DiscountBadge } from "@/components/ui/discount-badge";
import type { ProductListItem } from "@/features/catalog/actions";
import { resolveDisplayBrand } from "@/features/catalog/lib/brand-tree";
import { formatPrice } from "@/lib/format";
import { discountPercent, omnibusNote, referencePrice } from "@/lib/omnibus";

type Props = {
  product: ProductListItem;
  /** "new" adds the teal Nowość pill; promo signals show whenever there is a real reduction */
  badge?: "new";
};

/** Small horizontal product card for the dense homepage lists (Promocje extras, Nowości). */
export function HomeProductRow({ product, badge }: Props) {
  const variant = product.variants[0];
  const image = product.images[0];
  const brand = product.brand ? resolveDisplayBrand(product.brand) : null;
  const pct = variant ? discountPercent(variant) : null;
  const ref = variant ? referencePrice(variant) : null;
  const note = variant ? omnibusNote(variant) : null;

  return (
    <Link
      href={`/produkt/${product.slug}`}
      className="group flex h-full items-center gap-3 rounded-2xl bg-card p-2.5 pr-4 shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-card">
        {image && (
          <Image
            src={image.url}
            alt={image.altPl ?? [brand?.name, product.namePl].filter(Boolean).join(" ")}
            fill
            sizes="80px"
            className="object-contain p-1"
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {badge === "new" && (
            <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
              Nowość
            </span>
          )}
          {brand && <span className="truncate">{brand.name}</span>}
        </span>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {product.namePl}
        </h3>
        {variant && (
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-bold text-foreground">
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
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </span>
    </Link>
  );
}
