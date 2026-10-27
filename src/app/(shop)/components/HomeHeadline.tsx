import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CategoryItem } from "@/features/catalog/actions";
import { categoryIconFor } from "@/lib/category-icons";

type Props = {
  /** Quiet need links beside the H1 (desktop; phones have the header chips) */
  needs?: CategoryItem[];
};

/** The page's one H1 as a slim line, so the first shelf starts right under it. */
export function HomeHeadline({ needs = [] }: Props) {
  return (
    <div className="flex items-end justify-between gap-x-8 gap-y-2">
      <div className="min-w-0">
        <h1
          id="home-h1"
          className="text-balance font-heading text-xl font-extrabold leading-tight tracking-[-0.02em] sm:text-2xl md:text-3xl"
        >
          Suplementy diety, witaminy i zioła
        </h1>
        <p className="mt-0.5 text-muted-foreground max-sm:hidden">
          Ponad 1300 produktów z pełnym składem.
        </p>
      </div>
      {needs.length > 0 && (
        <nav aria-label="Na co?" className="shrink-0 max-xl:hidden">
          <ul className="flex items-center gap-1">
            {needs.map((c) => {
              const Icon = categoryIconFor(c);
              return (
                <li key={c.id}>
                  <Link
                    href={`/kategoria/${c.slug}`}
                    className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
                  >
                    <Icon className="size-4 text-primary" aria-hidden />
                    {c.namePl}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/kategorie"
                className="group flex min-h-11 items-center gap-1 px-3 text-sm font-semibold text-primary hover:underline"
              >
                Wszystkie
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  aria-hidden
                />
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
