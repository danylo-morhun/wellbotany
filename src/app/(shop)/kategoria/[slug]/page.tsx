import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { CategoryProductResults } from "@/features/catalog/components/CategoryProductResults";
import { FilterSidebarData } from "@/features/catalog/components/FilterSidebarData";
import { ProductGridSkeleton } from "@/features/catalog/components/ProductGridSkeleton";
import { MIN_LISTED_PRODUCTS } from "@/features/catalog/lib/nav";
import { pluralizeProducts } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildListingSeo } from "@/lib/seo";
import {
  getCategories,
  getCategoryBySlug,
  getRedirectTarget,
} from "../../../../features/catalog/actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { slug: true } });
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [category, categories] = await Promise.all([getCategoryBySlug(slug), getCategories()]);
  if (!category) return {};
  const productCount = categories.find((c) => c.id === category.id)?.productCount ?? 0;
  const heading = category.headingPl ?? category.namePl;
  const seo = buildListingSeo(`/kategoria/${category.slug}`, await searchParams);

  return {
    title: `${heading}${seo.titleSuffix}`,
    description:
      category.descriptionPl ??
      `${heading} – ${productCount} ${pluralizeProducts(productCount)} w sklepie Well Botany. Sprawdź skład, dawkowanie i ceny. Wysyłka InPost, DPD i DHL.`,
    alternates: { canonical: seo.canonical },
    // A near-empty listing is a thin page; index it once it fills up
    ...((seo.noindex || productCount < MIN_LISTED_PRODUCTS) && {
      robots: { index: false, follow: true },
    }),
  };
}

export default async function KategoriaSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);
  if (!category) {
    const target = await getRedirectTarget(`/kategoria/${slug}`);
    if (target) permanentRedirect(target);
    notFound();
  }

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

      <h1 className="mt-4 text-balance text-2xl text-foreground">
        {category.headingPl ?? category.namePl}
      </h1>
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
