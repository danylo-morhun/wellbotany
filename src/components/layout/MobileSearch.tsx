"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderSearch } from "@/features/catalog/components/HeaderSearch";
import type { IngredientChip } from "@/features/catalog/lib/ingredient-rank";

const MOBILE_INPUT_CLASS =
  // 16px text: iOS zooms into smaller inputs on focus
  "h-11 w-full rounded-full border border-input bg-muted/60 pl-11 pr-4 text-base text-foreground transition-shadow duration-200 placeholder:text-muted-foreground focus:border-transparent focus:bg-card focus:shadow-card focus:outline-none focus:ring-2 focus:ring-ring/50 motion-reduce:transition-none";

/**
 * Phones: the search field itself, full width under the logo row (a visible
 * field gets far more use than an icon). Sits outside the sticky header so it
 * scrolls away and leaves the sticky part one row tall. On the home page a
 * row of popular ingredients follows.
 */
export function MobileSearch({ ingredients }: { ingredients: IngredientChip[] }) {
  const isHome = usePathname() === "/";

  return (
    <div className="md:hidden print:hidden">
      <search className="block px-4 pt-3 pb-3 sm:px-6">
        <HeaderSearch placeholder="Szukaj: magnez, omega-3…" inputClassName={MOBILE_INPUT_CLASS} />
      </search>
      {isHome && ingredients.length > 0 && (
        <nav aria-label="Popularne składniki" className="-mt-1.5 pb-1">
          <ul className="flex items-center overflow-x-auto px-3 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
            {ingredients.map((i) => (
              <li key={i.slug} className="shrink-0">
                {/* 44px tap area around a compact pill */}
                <Link
                  href={`/skladniki/${i.slug}`}
                  className="group flex h-11 items-center px-1 outline-none"
                >
                  <span className="whitespace-nowrap rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:ring-2 group-focus-visible:ring-ring motion-reduce:transition-none">
                    {i.namePl}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
