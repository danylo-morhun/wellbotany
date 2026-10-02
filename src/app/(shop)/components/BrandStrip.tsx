import Link from "next/link";
import type { BrandItem } from "@/features/catalog/actions";
import { pluralizeProducts } from "@/lib/format";
import { SectionHeading } from "./SectionHeading";

const BRANDS_LIMIT = 12;
const MOBILE_LIMIT = 6;

type Props = { brands: BrandItem[] };

export function BrandStrip({ brands }: Props) {
  const top = [...brands]
    .sort((a, b) => b._count.products - a._count.products)
    .slice(0, BRANDS_LIMIT);
  if (top.length === 0) return null;

  return (
    <section aria-labelledby="brands-h" className="space-y-5">
      <SectionHeading
        id="brands-h"
        title="Nasze marki"
        link={{ href: "/marki", label: "Wszystkie marki" }}
      />
      {/* Flex-wrap + centered so an incomplete last row looks intentional;
          phones show the top 6 only */}
      <ul className="flex flex-wrap justify-center gap-3">
        {top.map((b, i) => (
          <li
            key={b.id}
            className={`w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(16.666%-0.625rem)] ${i >= MOBILE_LIMIT ? "max-sm:hidden" : ""}`}
          >
            <Link
              href={`/marki/${b.slug}`}
              className="flex h-16 flex-col items-center justify-center rounded-xl bg-card px-3 text-center shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="truncate text-sm font-bold text-foreground">{b.name}</span>
              <span className="text-xs text-muted-foreground">
                {b._count.products} {pluralizeProducts(b._count.products)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
