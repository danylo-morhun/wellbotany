import type { MetadataRoute } from "next";
import { getCategories } from "@/features/catalog/actions";
import { MAIN_IMAGE_FIRST } from "@/features/catalog/lib/main-image";
import { MIN_LISTED_PRODUCTS } from "@/features/catalog/lib/nav";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";

const STATIC_ROUTES = [
  "",
  "/katalog",
  "/kategorie",
  "/marki",
  "/zestawy-prezentowe",
  "/o-nas",
  "/kontakt",
  "/faq",
  "/dostawa",
  "/zwroty",
  "/regulamin",
  "/polityka-prywatnosci",
  "/cookies",
];

// New products/categories show up without a redeploy
export const revalidate = 3600;

// One file per page type so Search Console reports indexing per type;
// served at /sitemap/<id>.xml, listed by the index in sitemap_index.xml/route.ts
export const SITEMAP_IDS = ["static", "products", "categories", "brands", "gift-sets"] as const;
type SitemapId = (typeof SITEMAP_IDS)[number];

export async function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = (await props.id) as SitemapId;

  switch (id) {
    case "static":
      return STATIC_ROUTES.map((path) => ({ url: `${SITE_URL}${path}` }));

    case "products": {
      const products = await prisma.product.findMany({
        where: { status: "ACTIVE" },
        select: {
          slug: true,
          updatedAt: true,
          images: { select: { url: true }, orderBy: MAIN_IMAGE_FIRST },
        },
      });
      return products.map((p) => ({
        url: `${SITE_URL}/produkt/${p.slug}`,
        lastModified: p.updatedAt,
        images: p.images.map((i) => i.url),
      }));
    }

    case "categories": {
      const [categories, rows] = await Promise.all([
        getCategories(),
        prisma.category.findMany({ select: { id: true, updatedAt: true } }),
      ]);
      const updatedAt = new Map(rows.map((r) => [r.id, r.updatedAt]));
      // Near-empty categories are noindex (see kategoria/[slug]) — keep them out
      return categories
        .filter((c) => c.productCount >= MIN_LISTED_PRODUCTS)
        .map((c) => ({
          url: `${SITE_URL}/kategoria/${c.slug}`,
          lastModified: updatedAt.get(c.id),
        }));
    }

    case "brands": {
      const brands = await prisma.brand.findMany({
        where: { products: { some: { status: "ACTIVE" } } },
        select: { slug: true, updatedAt: true },
      });
      return brands.map((b) => ({
        url: `${SITE_URL}/marki/${b.slug}`,
        lastModified: b.updatedAt,
      }));
    }

    case "gift-sets": {
      const giftSets = await prisma.giftSet.findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true },
      });
      return giftSets.map((g) => ({
        url: `${SITE_URL}/zestawy-prezentowe/${g.slug}`,
        lastModified: g.updatedAt,
      }));
    }

    default:
      return [];
  }
}
