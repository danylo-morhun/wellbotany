import Image from "next/image";
import Link from "next/link";
import type { CategoryItem } from "@/features/catalog/actions";

type Props = { categories: CategoryItem[] };

function pluralProdukt(n: number): string {
  if (n === 1) return "produkt";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return "produkty";
  return "produktów";
}

export function CategoryGrid({ categories }: Props) {
  const topLevel = categories.filter((c) => c.parentId === null);

  if (topLevel.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-balance font-heading text-2xl font-bold tracking-tight">Kategorie</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {topLevel.map((cat) => (
          <Link
            key={cat.id}
            href={`/katalog?kategoria=${cat.slug}`}
            className="group flex flex-col items-center gap-3 rounded-2xl bg-card p-5 text-center shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {cat.image ? (
              <div className="relative size-16 transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                <Image src={cat.image} alt={cat.namePl} fill className="object-contain" />
              </div>
            ) : (
              <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-xl font-bold text-primary transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100">
                {cat.namePl.charAt(0)}
              </div>
            )}
            <span className="text-sm font-medium text-foreground">{cat.namePl}</span>
            {cat._count.products > 0 && (
              <span className="-mt-2 text-xs text-muted-foreground">
                {cat._count.products} {pluralProdukt(cat._count.products)}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
