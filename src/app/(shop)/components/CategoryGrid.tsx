import Image from "next/image";
import Link from "next/link";
import type { CategoryItem } from "@/features/catalog/actions";
import { getCategoryIcon } from "@/lib/category-icons";

type Props = { categories: CategoryItem[] };

const HOMEPAGE_LIMIT = 12;

function pluralProdukt(n: number): string {
  if (n === 1) return "produkt";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return "produkty";
  return "produktów";
}

function CategoryTile({ cat, count }: { cat: CategoryItem; count: number }) {
  const Icon = getCategoryIcon(cat.icon);
  return (
    <Link
      href={`/kategoria/${cat.slug}`}
      className="group flex flex-col items-center gap-3 text-center"
    >
      {cat.image ? (
        <div className="relative size-20 transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100 sm:size-24">
          <Image src={cat.image} alt={cat.namePl} fill className="object-contain" />
        </div>
      ) : (
        <div className="flex size-20 items-center justify-center rounded-full bg-secondary text-primary shadow-card transition-[transform,box-shadow] duration-200 group-hover:scale-105 group-hover:shadow-card-hover motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:size-24">
          {Icon ? (
            <Icon className="size-8 sm:size-9" strokeWidth={1.75} />
          ) : (
            <span className="text-2xl font-bold">{cat.namePl.charAt(0)}</span>
          )}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary sm:text-base">
          {cat.namePl}
        </p>
        {count > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {count} {pluralProdukt(count)}
          </p>
        )}
      </div>
    </Link>
  );
}

export function CategoryGrid({ categories }: Props) {
  const topLevel = categories.filter((c) => c.parentId === null);
  if (topLevel.length === 0) return null;

  const counts = new Map(categories.map((c) => [c.id, c.productCount]));
  const sorted = [...topLevel].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
  // Homepage shows the largest categories only; the full list lives on /kategorie
  const visible = sorted.slice(0, HOMEPAGE_LIMIT);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-balance font-heading text-2xl font-bold tracking-tight">Kategorie</h2>
        {sorted.length > visible.length && (
          <Link
            href="/kategorie"
            className="group rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground motion-reduce:transition-none"
          >
            Zobacz wszystkie
            <span className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0">
              →
            </span>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((cat) => (
          <CategoryTile key={cat.id} cat={cat} count={counts.get(cat.id) ?? 0} />
        ))}
      </div>
    </section>
  );
}
