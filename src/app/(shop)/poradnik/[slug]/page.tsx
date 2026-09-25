import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostProducts, getPublishedPost, getPublishedPosts } from "@/features/blog/lib/queries";
import { Breadcrumbs } from "@/features/catalog/components/Breadcrumbs";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { readFaq } from "@/features/glossary/lib/queries";
import { sanitizeRichText } from "@/lib/sanitize";
import { buildArticleJsonLd, buildFaqJsonLd, buildPageTitle, toJsonLdScript } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPublishedPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return {};
  return {
    title: buildPageTitle(post.metaTitlePl ?? post.titlePl),
    description: post.metaDescPl ?? post.excerptPl,
    alternates: { canonical: `/poradnik/${post.slug}` },
    openGraph: {
      type: "article",
      ...(post.coverImage && { images: [{ url: post.coverImage }] }),
    },
  };
}

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });

export default async function PoradnikPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const faq = readFaq(post.faqPl);
  const related = post.categorySlug ? await getPostProducts(post.categorySlug) : null;
  const path = `/poradnik/${post.slug}`;
  const published = post.publishedAt ?? post.createdAt;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by toJsonLdScript
        dangerouslySetInnerHTML={{
          __html: toJsonLdScript(
            buildArticleJsonLd({
              headline: post.titlePl,
              description: post.metaDescPl ?? post.excerptPl,
              path,
              datePublished: published,
              dateModified: post.updatedAt,
              image: post.coverImage,
              reviewedBy: post.reviewedBy,
            }),
          ),
        }}
      />
      <Breadcrumbs
        items={[
          { name: "Strona główna", href: "/" },
          { name: "Poradnik", href: "/poradnik" },
          { name: post.titlePl, href: path },
        ]}
      />

      <article className="mt-4 max-w-3xl">
        <h1 className="font-heading text-3xl text-foreground md:text-4xl">{post.titlePl}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{post.excerptPl}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Opublikowano: {dateFormat.format(published)}
          {post.updatedAt.getTime() - published.getTime() > 24 * 60 * 60 * 1000 &&
            ` · Zaktualizowano: ${dateFormat.format(post.updatedAt)}`}
          {post.reviewedBy && ` · Sprawdził(a): ${post.reviewedBy}`}
        </p>
        {post.coverImage && (
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl">
            <Image
              src={post.coverImage}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}
        <div
          className="prose prose-sm mt-6 max-w-none text-muted-foreground md:prose-base prose-headings:font-heading prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-li:marker:text-primary"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by sanitizeRichText
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.contentPl) }}
        />
        <p className="mt-6 rounded-2xl bg-secondary/60 p-4 text-xs text-muted-foreground">
          Artykuł ma charakter edukacyjny i nie zastępuje porady lekarza lub farmaceuty. Suplement
          diety nie może być stosowany jako substytut zróżnicowanej diety.
        </p>
      </article>

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

      {related && related.items.length > 0 && related.category && (
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-heading text-2xl text-foreground">
              {related.category.headingPl ?? related.category.namePl}
            </h2>
            <Link
              href={`/kategoria/${related.category.slug}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              Zobacz wszystkie
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.items.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
