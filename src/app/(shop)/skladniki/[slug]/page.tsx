import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import {
  getIngredientBySlug,
  getIngredientProducts,
  getIngredients,
  readFaq,
} from "@/features/glossary/lib/queries";
import { sanitizeRichText } from "@/lib/sanitize";
import { buildArticleJsonLd, buildFaqJsonLd, buildPageTitle, toJsonLdScript } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getIngredients()).map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ingredient = await getIngredientBySlug(slug);
  if (!ingredient) return {};
  return {
    title: buildPageTitle(
      ingredient.metaTitlePl ?? `${ingredient.namePl} – formy, dawki, produkty`,
    ),
    description: ingredient.metaDescPl ?? ingredient.shortPl,
    alternates: { canonical: `/skladniki/${ingredient.slug}` },
    openGraph: { type: "article" },
  };
}

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });

export default async function SkladnikPage({ params }: Props) {
  const { slug } = await params;
  const ingredient = await getIngredientBySlug(slug);
  if (!ingredient) notFound();

  const { items, total } = await getIngredientProducts(
    ingredient.matchTerms,
    ingredient.excludeTerms,
  );
  const faq = readFaq(ingredient.faqPl);
  const path = `/skladniki/${ingredient.slug}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by toJsonLdScript
        dangerouslySetInnerHTML={{
          __html: toJsonLdScript(
            buildArticleJsonLd({
              headline: ingredient.namePl,
              description: ingredient.metaDescPl ?? ingredient.shortPl,
              path,
              datePublished: ingredient.createdAt,
              dateModified: ingredient.updatedAt,
            }),
          ),
        }}
      />
      <Breadcrumbs
        items={[
          { name: "Strona główna", href: "/" },
          { name: "Składniki", href: "/skladniki" },
          { name: ingredient.namePl, href: path },
        ]}
      />

      <article className="mt-4 max-w-3xl">
        <h1 className="font-heading text-3xl text-foreground">{ingredient.namePl}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{ingredient.shortPl}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Zaktualizowano: {dateFormat.format(ingredient.updatedAt)}
        </p>
        <div
          className="prose prose-sm mt-6 max-w-none text-muted-foreground prose-headings:font-heading prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-li:marker:text-primary"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by sanitizeRichText
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(ingredient.contentPl) }}
        />
        <p className="mt-6 rounded-2xl bg-secondary/60 p-4 text-xs text-muted-foreground">
          Informacje mają charakter edukacyjny i nie zastępują porady lekarza lub farmaceuty.
          Suplement diety nie może być stosowany jako substytut zróżnicowanej diety.
        </p>
      </article>

      {items.length > 0 && (
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-heading text-2xl text-foreground">
              Produkty: {ingredient.namePl.toLocaleLowerCase("pl")}
            </h2>
            {ingredient.categorySlug && total > items.length && (
              <Link
                href={`/kategoria/${ingredient.categorySlug}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Zobacz wszystkie ({total})
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {faq.length > 0 && (
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
