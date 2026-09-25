import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { CategoryProductResults } from "@/features/catalog/components/CategoryProductResults";
import { FilterSidebarData } from "@/features/catalog/components/FilterSidebarData";
import { ProductGridSkeleton } from "@/features/catalog/components/ProductGridSkeleton";
import { MIN_LISTED_PRODUCTS } from "@/features/catalog/lib/nav";
import { pluralizeProducts } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";
import { buildFaqJsonLd, buildListingSeo, buildPageTitle, toJsonLdScript } from "@/lib/seo";
import {
  getCategories,
  getCategoryBySlug,
  getRedirectTarget,
} from "../../../../features/catalog/actions";

type FaqRow = { q: string; a: string };

function readFaq(value: unknown): FaqRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is FaqRow => typeof row?.q === "string" && typeof row?.a === "string",
  );
}

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
    title: buildPageTitle(`${category.metaTitlePl ?? heading}${seo.titleSuffix}`),
    description:
      category.metaDescPl ??
      category.descriptionPl ??
      `${heading} – ${productCount} ${pluralizeProducts(productCount)} w sklepie Well Botany. Sprawdź skład, dawkowanie i ceny. Wysyłka InPost i Orlen Paczka.`,
    alternates: { canonical: seo.canonical },
    // A near-empty listing is a thin page; index it once it fills up
    ...((seo.noindex || productCount < MIN_LISTED_PRODUCTS) && {
      robots: { index: false, follow: true },
    }),
  };
}

export default async function KategoriaSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;

  const [category, categories] = await Promise.all([getCategoryBySlug(slug), getCategories()]);
  if (!category) {
    const target = await getRedirectTarget(`/kategoria/${slug}`);
    if (target) permanentRedirect(target);
    notFound();
  }

  // Guide + FAQ only on the plain first page — paginated/filtered variants
  // would otherwise repeat the same text under different URLs
  const seo = buildListingSeo(`/kategoria/${category.slug}`, await searchParams);
  const showGuide = seo.page === 1 && !seo.noindex;
  const faq = readFaq(category.faqPl);
  const countBySlug = new Map(categories.map((c) => [c.slug, c.productCount]));
  const subcategories = category.children.filter(
    (c) => (countBySlug.get(c.slug) ?? 0) >= MIN_LISTED_PRODUCTS,
  );

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
        <p className="mt-2 max-w-3xl text-muted-foreground">{category.descriptionPl}</p>
      )}

      {subcategories.length > 0 && (
        <nav aria-label="Podkategorie" className="mt-4 flex flex-wrap gap-2">
          {subcategories.map((sub) => (
            <Link
              key={sub.slug}
              href={`/kategoria/${sub.slug}`}
              className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              {sub.namePl}
            </Link>
          ))}
        </nav>
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

      {showGuide && category.contentPl && (
        <section className="mt-16 max-w-3xl">
          <div
            className="prose prose-sm max-w-none text-muted-foreground prose-headings:font-heading prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-li:marker:text-primary"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by sanitizeRichText
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(category.contentPl) }}
          />
        </section>
      )}

      {showGuide && faq.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <script
            type="application/ld+json"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by toJsonLdScript
            dangerouslySetInnerHTML={{ __html: toJsonLdScript(buildFaqJsonLd(faq)) }}
          />
          <h2 className="mb-4 font-heading text-xl text-foreground">
            Najczęściej zadawane pytania
          </h2>
          <div className="space-y-3">
            {faq.map((row) => (
              <details key={row.q} className="group rounded-2xl bg-card shadow-card">
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold marker:content-none">
                  {row.q}
                </summary>
                <p className="px-5 pb-4 text-sm text-muted-foreground">{row.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
