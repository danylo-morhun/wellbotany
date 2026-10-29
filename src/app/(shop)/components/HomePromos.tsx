import Image from "next/image";
import Link from "next/link";
import { DiscountBadge } from "@/components/ui/discount-badge";
import { QuickAddButton } from "@/features/cart/components/QuickAddButton";
import type { ProductListItem } from "@/features/catalog/actions";
import { resolveDisplayBrand } from "@/features/catalog/lib/brand-tree";
import { formatPrice } from "@/lib/format";
import { discountPercent, omnibusNote, referencePrice } from "@/lib/omnibus";
import { cn } from "@/lib/utils";
import { HomeProductRow } from "./HomeProductRow";
import { SectionHeading } from "./SectionHeading";

type Props = { products: ProductListItem[] };

/** Biggest reduction as one large tile, the rest as small rows. Orange marks
 * the discount only; every reduction keeps its Omnibus note. */
export function HomePromos({ products }: Props) {
  const [lead, ...rest] = products;
  if (!lead) return null;

  return (
    <section aria-labelledby="promos-h" className="space-y-4">
      <SectionHeading
        id="promos-h"
        title="Promocje"
        link={{ href: "/katalog?promocje=1", label: "Zobacz wszystkie" }}
      />
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
        <PromoLead product={lead} alone={rest.length === 0} />
        {rest.length > 0 && (
          <ul className="grid content-start gap-3 sm:grid-cols-2 sm:gap-4 lg:col-span-5 lg:grid-cols-1">
            {rest.map((p, i) => (
              // Phones get the lead tile plus two rows; the rest is one tap away
              <li key={p.id} className={i >= 2 ? "max-sm:hidden" : undefined}>
                <HomeProductRow product={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PromoLead({ product, alone }: { product: ProductListItem; alone: boolean }) {
  const variant = product.variants[0];
  const image = product.images[0];
  const brand = product.brand ? resolveDisplayBrand(product.brand) : null;
  const pct = variant ? discountPercent(variant) : null;
  const ref = variant ? referencePrice(variant) : null;
  const note = variant ? omnibusNote(variant) : null;
  const href = `/produkt/${product.slug}`;

  return (
    <article
      className={cn(
        "group grid grid-cols-[2fr_3fr] items-center gap-4 rounded-2xl bg-card p-3 shadow-card sm:gap-6 sm:p-5 lg:grid-cols-2",
        alone ? "lg:col-span-8" : "lg:col-span-7",
      )}
    >
      <Link href={href} className="relative block aspect-square overflow-hidden rounded-xl bg-card">
        {image && (
          <Image
            src={image.url}
            alt={image.altPl ?? [brand?.name, product.namePl].filter(Boolean).join(" ")}
            fill
            sizes="(max-width: 1024px) 40vw, 320px"
            className="object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        )}
        {pct != null && <DiscountBadge percent={pct} variant="corner" size="lg" />}
      </Link>
      <div className="flex min-w-0 flex-col">
        {brand && (
          <Link
            href={`/marki/${brand.slug}`}
            className="text-xs font-medium text-muted-foreground hover:text-foreground sm:text-sm"
          >
            {brand.name}
          </Link>
        )}
        <Link href={href} className="mt-0.5">
          <h3 className="line-clamp-3 text-base font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-xl">
            {product.namePl}
          </h3>
        </Link>
        {variant && (
          <>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2 sm:mt-4">
              <span className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {formatPrice(variant.pricePln)}
              </span>
              {ref != null && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(ref)}
                </span>
              )}
            </p>
            {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
            <div className="mt-3 max-w-56 sm:mt-5">
              <QuickAddButton variantId={variant.id} />
            </div>
          </>
        )}
      </div>
    </article>
  );
}
