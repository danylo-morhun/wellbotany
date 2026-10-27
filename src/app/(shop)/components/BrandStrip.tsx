import Image from "next/image";
import Link from "next/link";
import type { BrandItem } from "@/features/catalog/actions";
import { pluralizeProducts } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";

const BRANDS_LIMIT = 12;
const MOBILE_LIMIT = 6;

type Props = { brands: BrandItem[] };

/** Brand wall: one white panel split by hairlines, logo (or wordmark) per cell. */
export function BrandStrip({ brands }: Props) {
  const top = [...brands]
    .sort((a, b) => b._count.products - a._count.products)
    .slice(0, BRANDS_LIMIT);
  if (top.length === 0) return null;

  return (
    <section aria-labelledby="brands-h" className="space-y-4">
      <SectionHeading
        id="brands-h"
        title="Nasze marki"
        link={{ href: "/marki", label: "Wszystkie marki" }}
      />
      {/* Each cell draws its right/bottom hairline; the list overhangs the panel by 1px
          so the outer edge lines are clipped and an incomplete last row stays white.
          Phones show the top 6. */}
      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <ul className="-mb-px -mr-px grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {top.map((b, i) => (
            <li
              key={b.id}
              className={cn(
                "shadow-[inset_-1px_-1px_0_var(--border)]",
                i >= MOBILE_LIMIT && "max-sm:hidden",
              )}
            >
              <Link
                href={`/marki/${b.slug}`}
                className="group flex h-full min-h-20 flex-col items-center justify-center gap-1 px-3 py-4 text-center transition-colors duration-200 hover:bg-secondary/60 motion-reduce:transition-none"
              >
                {b.logo ? (
                  <Image
                    src={b.logo}
                    alt={b.name}
                    width={120}
                    height={40}
                    className="h-9 w-auto max-w-full object-contain"
                  />
                ) : (
                  <span className="max-w-full truncate font-heading text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {b.name}
                  </span>
                )}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {b._count.products} {pluralizeProducts(b._count.products)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
