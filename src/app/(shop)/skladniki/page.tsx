import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { getIngredients } from "@/features/glossary/lib/queries";

export const metadata: Metadata = {
  title: "Składniki suplementów od A do Z",
  description:
    "Słownik składników suplementów diety: formy, dawki, na co zwrócić uwagę i w jakich produktach je znajdziesz. Magnez, witamina D3, ashwagandha i inne.",
  alternates: { canonical: "/skladniki" },
};

export default async function SkladnikiPage() {
  const ingredients = await getIngredients();
  const byLetter = new Map<string, typeof ingredients>();
  for (const item of ingredients) {
    const letter = item.namePl.charAt(0).toLocaleUpperCase("pl");
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), item]);
  }
  const letters = [...byLetter.keys()].sort((a, b) => a.localeCompare(b, "pl"));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Strona główna", href: "/" },
          { name: "Składniki", href: "/skladniki" },
        ]}
      />
      <h1 className="mt-4 font-heading text-3xl text-foreground">
        Składniki suplementów od A do Z
      </h1>
      <p className="mt-3 max-w-3xl text-muted-foreground">
        Krótkie przewodniki po najpopularniejszych składnikach suplementów diety: czym są, w jakich
        formach występują, jak czytać dawki na etykiecie i na co uważać. Przy każdym składniku
        znajdziesz produkty, które go zawierają.
      </p>

      <nav aria-label="Litery" className="mt-6 flex flex-wrap gap-1.5">
        {letters.map((letter) => (
          <a
            key={letter}
            href={`#litera-${letter}`}
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
          >
            {letter}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-8">
        {letters.map((letter) => (
          <section key={letter} id={`litera-${letter}`} aria-labelledby={`h-${letter}`}>
            <h2 id={`h-${letter}`} className="font-heading text-xl text-foreground">
              {letter}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {(byLetter.get(letter) ?? []).map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/skladniki/${item.slug}`}
                    className="block h-full rounded-2xl bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover"
                  >
                    <span className="font-semibold text-foreground">{item.namePl}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{item.shortPl}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
