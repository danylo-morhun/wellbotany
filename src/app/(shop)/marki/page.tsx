import { getBrands } from "@/features/catalog/actions";
import { BrandRow } from "./BrandRow";

export const metadata = {
  title: "Marki",
  description:
    "Przeglądaj produkty według marek — suplementy, witaminy i produkty bio najwyższej jakości.",
};

export default async function MarkiPage() {
  // getBrands only returns brands with an ACTIVE product and counts ACTIVE
  // products — a brand whose whole catalog is still DRAFT (e.g. imported
  // without prices) would otherwise show a misleading count and 404 empty
  // page (HealthLabs Care, HILKI hit this: 115 and 1 products, 0 ACTIVE).
  const brands = await getBrands();

  const totalProducts = brands.reduce((sum, b) => sum + b._count.products, 0);

  const groups = new Map<string, typeof brands>();
  for (const brand of brands) {
    const firstChar = brand.name[0] ?? "";
    const letter = /[a-z]/i.test(firstChar) ? firstChar.toUpperCase() : "#";
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
                  <BrandRow key={brand.id} brand={brand} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
