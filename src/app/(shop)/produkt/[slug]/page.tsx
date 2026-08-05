import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminEditBar } from "@/features/catalog/components/AdminEditBar";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { ProductActionsClient } from "@/features/catalog/components/ProductActionsClient";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { ProductGallery } from "@/features/catalog/components/ProductGallery";
import {
  ProductWishlistButton,
  ProductWishlistButtonFallback,
} from "@/features/wishlist/components/ProductWishlistButton";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";
import { buildProductJsonLd, toJsonLdScript } from "@/lib/seo";
import { getProduct, getRelatedProducts } from "../../../../features/catalog/actions";

type Props = {
  params: Promise<{ slug: string }>;
};

// Prebuilds the most relevant slugs so most visitors hit an already-static
// page; anything outside this set still renders on first visit and is then
// cached like the rest (default dynamicParams behavior).
export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  const title = product.metaTitlePl ?? product.namePl;
  const description = product.metaDescPl ?? product.shortDescPl ?? undefined;
  const mainImage = product.images.find((img) => img.isMain)?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: mainImage ? [{ url: mainImage }] : undefined,
    },
  };
}

export default async function ProduktPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const related = await getRelatedProducts({
    id: product.id,
    categorySlug: product.category?.slug ?? null,
    brandSlug: product.brand?.slug ?? null,
    tagSlugs: product.tags.map((t) => t.tag.slug),
  });

  const jsonLd = buildProductJsonLd({
    name: product.namePl,
    description: product.descriptionPl,
    images: product.images.map((img) => img.url),
    brandName: product.brand?.name,
    variants: product.variants,
    slug: product.slug,
  });

  const breadcrumbs = [
    { name: "Strona główna", href: "/" },
    { name: "Katalog", href: "/katalog" },
    ...(product.category
      ? [
          ...(product.category.parent
            ? [
                {
                  name: product.category.parent.namePl,
                  href: `/kategoria/${product.category.parent.slug}`,
                },
              ]
            : []),
          {
            name: product.category.namePl,
            href: `/kategoria/${product.category.slug}`,
          },
        ]
      : []),
    { name: product.namePl, href: `/produkt/${product.slug}` },
  ];

  const healthWarnings = product.healthWarnings as string[] | null;
  const ingredients = product.ingredients as {
    pl?: string;
    en?: string;
  } | null;

  return (
    <>
      <Suspense fallback={null}>
        <AdminEditBar productId={product.id} />
      </Suspense>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toJsonLdScript(jsonLd) }}
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <ProductGallery images={product.images} productName={product.namePl} />

          <div className="space-y-6">
            {product.brand && (
              <a
                href={`/marki/${product.brand.slug}`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {product.brand.name}
              </a>
            )}

            <h1 className="text-balance text-2xl text-foreground leading-tight">
              {product.namePl}
            </h1>

            {product.shortDescPl && <p className="text-muted-foreground">{product.shortDescPl}</p>}

            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag.namePl}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1">
                <ProductActionsClient variants={product.variants} productName={product.namePl} />
              </div>
              <div className="flex items-end pb-0.5">
                <Suspense fallback={<ProductWishlistButtonFallback />}>
                  <ProductWishlistButton productId={product.id} />
                </Suspense>
              </div>
            </div>

            {product.netWeight && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-muted-foreground">Masa netto</dt>
                <dd className="font-medium">{product.netWeight}</dd>
                {product.servingSize && (
                  <>
                    <dt className="text-muted-foreground">Porcja</dt>
                    <dd className="font-medium">{product.servingSize}</dd>
                  </>
                )}
                {product.servingsPerContainer && (
                  <>
                    <dt className="text-muted-foreground">Porcji w opakowaniu</dt>
                    <dd className="font-medium">{product.servingsPerContainer}</dd>
                  </>
                )}
              </dl>
            )}
          </div>
        </div>

        <div className="mt-12 space-y-8">
          {product.descriptionPl && (
            <section>
              <h2 className="text-lg font-semibold text-foreground">Opis</h2>
              <div
                className="prose prose-sm mt-3 max-w-none text-muted-foreground prose-headings:font-semibold prose-headings:text-foreground prose-strong:text-foreground prose-ul:my-3 prose-li:my-1 prose-li:marker:text-primary"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(product.descriptionPl) }}
              />
            </section>
          )}

          {ingredients?.pl && (
            <section>
              <h2 className="text-lg font-semibold text-foreground">Skład</h2>
              <p className="mt-3 text-sm text-muted-foreground">{ingredients.pl}</p>
            </section>
          )}

          {product.storageInfo && (
            <section>
              <h2 className="text-lg font-semibold text-foreground">Przechowywanie</h2>
              <p className="mt-3 text-sm text-muted-foreground">{product.storageInfo}</p>
            </section>
          )}

          {healthWarnings && healthWarnings.length > 0 && (
            <section className="rounded-2xl bg-secondary/60 p-5">
              <h2 className="text-sm font-semibold text-foreground">Informacje regulacyjne</h2>
              <ul className="mt-2 space-y-1">
                {healthWarnings.map((warning) => (
                  <li key={warning} className="text-xs text-muted-foreground">
                    {warning}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl">Podobne produkty</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
