import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { CategoryProductResults } from "@/features/catalog/components/CategoryProductResults";
import { ProductGridSkeleton } from "@/features/catalog/components/ProductGridSkeleton";
import { prisma } from "@/lib/prisma";
import { getBrandBySlug } from "../../../../features/catalog/actions";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  const brands = await prisma.brand.findMany({ select: { slug: true } });
  return brands.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return {};

  return {
    title: brand.name,
    description: brand.description ?? `Produkty marki ${brand.name}`,
  };
}

export default async function MarkiSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;

  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const breadcrumbs = [
    { name: "Strona główna", href: "/" },
    { name: "Marki", href: "/marki" },
    { name: brand.name, href: `/marki/${brand.slug}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-6 flex items-start gap-6">
        {brand.logo && (
          <Image
            src={brand.logo}
            alt={`Logo ${brand.name}`}
            width={64}
            height={64}
            className="rounded-lg object-contain"
          />
        )}
        <div>
          <h1 className="text-balance text-2xl text-foreground">{brand.name}</h1>
          {brand.description && <p className="mt-1 text-muted-foreground">{brand.description}</p>}
          {brand.website && (
            <a
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm text-muted-foreground hover:text-foreground"
            >
              {brand.website}
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Suspense fallback={<ProductGridSkeleton count={8} />}>
          <CategoryProductResults
            searchParams={searchParams}
            extraFilters={{ marka: slug }}
            basePath={`/marki/${slug}`}
          />
        </Suspense>
      </div>
    </div>
  );
}
