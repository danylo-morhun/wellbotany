import Link from "next/link";
import type { CategoryItem } from "@/features/catalog/actions";
import { categoryIconFor } from "@/lib/category-icons";

const NEEDS_LIMIT = 8;

type Props = { categories: CategoryItem[] };

/** Orientation band under the hero: the page's one display-size H1 and the
 * shortcuts into the biggest "na …" need categories. Kept short so the first
 * product row still shows on the first screen. */
export function HomeIntro({ categories }: Props) {
  const needs = categories
    .filter((c) => c.parentId === null && c.slug.startsWith("na-") && c.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, NEEDS_LIMIT);

  return (
    <section
      aria-labelledby="home-h1"
      className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12"
    >
      <div className="space-y-2">
        <h1
          id="home-h1"
          className="text-balance font-heading text-[clamp(2.25rem,5vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-0.02em]"
        >
          Suplementy diety, witaminy i zioła
        </h1>
        <p className="text-muted-foreground md:text-lg">
          Ponad 1300 produktów z pełnym składem. Czego szukasz?
        </p>
      </div>
      {needs.length > 0 && (
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {needs.map((c) => {
            const Icon = categoryIconFor(c);
            return (
              <li key={c.id} className="shrink-0">
                <Link
                  href={`/kategoria/${c.slug}`}
                  className="group flex h-11 items-center gap-2 rounded-full bg-secondary pl-3 pr-4 text-sm font-semibold text-secondary-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground motion-reduce:transition-none"
                >
                  <Icon
                    className="size-[18px] shrink-0 text-primary transition-colors duration-200 group-hover:text-primary-foreground motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                  <span className="whitespace-nowrap">{c.namePl}</span>
                  <span className="text-xs font-medium tabular-nums opacity-70">
                    {c.productCount}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
