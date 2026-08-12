import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { CategoryProductResults } from "@/features/catalog/components/CategoryProductResults";
import { FilterSidebarData } from "@/features/catalog/components/FilterSidebarData";
import { ProductGridSkeleton } from "@/features/catalog/components/ProductGridSkeleton";
import { prisma } from "@/lib/prisma";
import { getCategoryBySlug } from "../../../../features/catalog/actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { slug: true } });
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  return {
    title: category.namePl,
    description: category.descriptionPl ?? `Produkty w kategorii ${category.namePl}`,
    alternates: { canonical: `/kategoria/${category.slug}` },
  };
}

export default async function KategoriaSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const breadcrumbs = [
    { name: "Strona główna", href: "/" },
    { name: "Katalog", href: "/katalog" },
    ...(category.parent
      ? [
          {
            name: category.parent.namePl,
            href: `/kategoria/${category.parent.slug}`,
          },
        ]
      : []),
    { name: category.namePl, href: `/kategoria/${category.slug}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <h1 className="mt-4 text-balance text-2xl text-foreground">{category.namePl}</h1>
      {category.descriptionPl && (
        <p className="mt-2 text-muted-foreground">{category.descriptionPl}</p>
      )}

      <div className="mt-6 flex gap-8">
        <div className="hidden w-56 shrink-0 lg:block">
          <Suspense>
            <FilterSidebarData
              searchParams={searchParams}
              categoryOverride={slug}
              basePath="/katalog"
            />
          </Suspense>
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <Suspense fallback={<ProductGridSkeleton count={8} />}>
            <CategoryProductResults
              searchParams={searchParams}
              extraFilters={{ kategoria: slug }}
              basePath={`/kategoria/${slug}`}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
