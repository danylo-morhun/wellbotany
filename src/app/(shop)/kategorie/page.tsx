import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Kategorie",
  description: "Przeglądaj produkty według kategorii — suplementy, witaminy i produkty bio.",
};

export default async function KategoriePage() {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      namePl: true,
      image: true,
      children: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          namePl: true,
          _count: { select: { products: { where: { status: "ACTIVE" } } } },
        },
      },
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
  });

  return (
    <main className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Kategorie</h1>
        <p className="mt-2 text-muted-foreground">Znajdź produkty dopasowane do Twoich potrzeb</p>
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">Brak kategorii do wyświetlenia.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-2xl bg-card shadow-card flex flex-col overflow-hidden"
            >
              <Link
                href={`/kategoria/${cat.slug}`}
                className="group flex items-center gap-4 p-5 transition-colors duration-200 hover:bg-muted/40 motion-reduce:transition-none"
              >
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  {cat.image ? (
                    <div className="relative size-10">
                      <Image
                        src={cat.image}
                        alt={cat.namePl}
                        fill
                        className="object-contain"
                        sizes="40px"
                      />
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-primary">{cat.namePl.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 motion-reduce:transition-none">
                    {cat.namePl}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {cat._count.products} produktów
                  </p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors duration-200 motion-reduce:transition-none"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>

              {cat.children.length > 0 && (
                <div className="border-t border-border px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/kategoria/${sub.slug}`}
                        className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground motion-reduce:transition-none"
                      >
                        {sub.namePl}
                        <span className="text-[10px] opacity-60">{sub._count.products}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
