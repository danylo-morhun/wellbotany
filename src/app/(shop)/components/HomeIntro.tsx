import Link from "next/link";
import type { CategoryItem } from "@/features/catalog/actions";

// Two even rows of four on desktop
const NEEDS_LIMIT = 8;

type Props = { categories: CategoryItem[] };

/** Keyword H1 + shortcuts into the biggest "na …" need categories. */
export function HomeIntro({ categories }: Props) {
  const needs = categories
    .filter((c) => c.parentId === null && c.slug.startsWith("na-") && c.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, NEEDS_LIMIT);

  return (
    <section aria-labelledby="home-h1" className="space-y-4">
      <div className="space-y-1">
        <h1
          id="home-h1"
          className="text-balance font-heading text-2xl font-extrabold tracking-tight md:text-3xl"
        >
          Suplementy diety, witaminy i zioła
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Ponad 1300 produktów z pełnym składem. Czego szukasz?
        </p>
      </div>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 md:gap-3 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {needs.map((c) => (
          <li key={c.id} className="shrink-0">
            <Link
              href={`/kategoria/${c.slug}`}
              className="flex h-11 items-center justify-between gap-2 rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground motion-reduce:transition-none md:h-12 md:rounded-xl md:text-[15px]"
            >
              <span className="truncate">{c.namePl}</span>
              <span className="shrink-0 text-xs font-medium opacity-70">{c.productCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
