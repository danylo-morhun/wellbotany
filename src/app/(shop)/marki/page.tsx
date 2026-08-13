import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Marki",
  description:
    "Przeglądaj produkty według marek — suplementy, witaminy i produkty bio najwyższej jakości.",
};

export default async function MarkiPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { products: true } },
    },
  });

  const totalProducts = brands.reduce((sum, b) => sum + b._count.products, 0);

  const groups = new Map<string, typeof brands>();
  for (const brand of brands) {
    const letter = /[a-z]/i.test(brand.name[0] ?? "") ? brand.name[0]!.toUpperCase() : "#";
    const bucket = groups.get(letter);
    if (bucket) bucket.push(brand);
    else groups.set(letter, [brand]);
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 md:py-16">
      <div className="mb-10 md:mb-14">
        <h1 className="font-heading text-3xl text-foreground md:text-4xl">Marki</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {brands.length} marek · {totalProducts} produktów
        </p>
      </div>

      {groups.size === 0 ? (
        <p className="text-muted-foreground">Brak marek do wyświetlenia.</p>
      ) : (
        <div>
          {Array.from(groups.entries()).map(([letter, letterBrands]) => (
            <section key={letter} className="flex gap-4 md:gap-8">
              <div className="w-6 shrink-0 pt-5 text-sm font-semibold text-muted-foreground/60 md:w-10 md:text-base">
                {letter}
              </div>
              <div className="flex-1 divide-y divide-border/60 border-b border-border/60">
                {letterBrands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/marki/${brand.slug}`}
                    className="group flex items-center justify-between gap-4 py-5 transition-colors duration-200 ease-out motion-reduce:transition-none"
                  >
                    <span className="text-xl font-semibold text-foreground transition-colors duration-200 ease-out group-hover:text-primary md:text-2xl motion-reduce:transition-none">
                      {brand.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                      {brand._count.products} produktów
                      <ArrowUpRight
                        className="size-4 -translate-x-1 opacity-0 transition-[transform,opacity] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
