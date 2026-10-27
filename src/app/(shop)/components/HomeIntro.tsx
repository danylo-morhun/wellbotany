import Link from "next/link";
import type { CategoryItem } from "@/features/catalog/actions";
import { categoryIconFor } from "@/lib/category-icons";
import { pluralizeProducts } from "@/lib/format";
import { HomeTabs } from "./HomeTabs";

// ≤10 per group (Baymard: show a real share of the range, each a full listing)
const TILES_LIMIT = 10;

type Props = { categories: CategoryItem[] };

const topLevel = (categories: CategoryItem[], groups: CategoryItem["group"][]) =>
  categories
    .filter((c) => c.parentId === null && groups.includes(c.group) && c.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, TILES_LIMIT);

/** The page's one H1 plus the one category navigation block: by need or by type. */
export function HomeIntro({ categories }: Props) {
  const needs = topLevel(categories, ["NEED"]);
  // Food and cosmetics are top-level "other" groups but are product types to a shopper
  const types = topLevel(categories, ["TYPE", "OTHER"]);
  const allLink = { href: "/kategorie", label: "Wszystkie kategorie" };
  const tabs = [
    { id: "needs", label: "Na co?", items: needs },
    { id: "types", label: "Rodzaj", items: types },
  ]
    .filter((tab) => tab.items.length > 0)
    .map(({ items, ...tab }) => ({
      ...tab,
      panel: <CategoryTiles items={items} />,
      link: allLink,
    }));

  return (
    <section aria-labelledby="home-h1" className="space-y-5 md:space-y-6">
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
      {tabs.length > 0 && <HomeTabs tabs={tabs} label="Kategorie" />}
    </section>
  );
}

function CategoryTiles({ items }: { items: CategoryItem[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-5">
      {items.map((c) => {
        const Icon = categoryIconFor(c);
        return (
          <li key={c.id}>
            <Link
              href={`/kategoria/${c.slug}`}
              className="group flex h-full min-h-14 items-center gap-2.5 rounded-xl bg-card px-3 py-2 sm:gap-3 sm:py-2.5 shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary sm:size-9">
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[0.8125rem] font-semibold leading-tight text-foreground group-hover:text-primary sm:text-sm sm:leading-snug">
                  {c.namePl}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {c.productCount} {pluralizeProducts(c.productCount)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
