import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CategoryItem } from "@/features/catalog/actions";
import { getCategoryIcon } from "@/lib/category-icons";

type Props = { categories: CategoryItem[] };

const VISIBLE_COUNT = 6;
const GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

function pluralProdukt(n: number): string {
  if (n === 1) return "produkt";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return "produkty";
  return "produktów";
}

function CategoryTile({ cat }: { cat: CategoryItem }) {
  const Icon = getCategoryIcon(cat.icon);
  return (
    <Link
      href={`/katalog?kategoria=${cat.slug}`}
      className="group flex flex-col items-center gap-3 rounded-2xl bg-card p-5 text-center shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {cat.image ? (
        <div className="relative size-14 transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100">
          <Image src={cat.image} alt={cat.namePl} fill className="object-contain" />
        </div>
      ) : (
        <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-lg font-bold text-primary transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100">
          {Icon ? <Icon className="size-6" /> : cat.namePl.charAt(0)}
        </div>
      )}
      <span className="line-clamp-2 text-sm font-medium text-foreground">{cat.namePl}</span>
      {cat._count.products > 0 && (
        <span className="text-xs text-muted-foreground">
          {cat._count.products} {pluralProdukt(cat._count.products)}
        </span>
      )}
    </Link>
  );
}

export function CategoryGrid({ categories }: Props) {
  const topLevel = categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => b._count.products - a._count.products);

  if (topLevel.length === 0) return null;

  const visible = topLevel.slice(0, VISIBLE_COUNT);
  const rest = topLevel.slice(VISIBLE_COUNT);

  return (
    <section className="space-y-4">
      <h2 className="text-balance font-heading text-2xl font-bold tracking-tight">Kategorie</h2>
      <div className={GRID_CLASS}>
        {visible.map((cat) => (
          <CategoryTile key={cat.id} cat={cat} />
        ))}
      </div>
      {rest.length > 0 && (
        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-primary transition-colors duration-200 hover:bg-secondary motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Pokaż wszystkie kategorie</span>
            <span className="hidden group-open:inline">Pokaż mniej</span>
            <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className={`${GRID_CLASS} mt-3`}>
            {rest.map((cat) => (
              <CategoryTile key={cat.id} cat={cat} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
