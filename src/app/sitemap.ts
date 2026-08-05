import type { MetadataRoute } from "next";
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.5,
  }));

  try {
    const [products, categories, brands, giftSets] = await Promise.all([
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.brand.findMany({ select: { slug: true } }),
      prisma.giftSet.findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${SITE_URL}/produkt/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${SITE_URL}/kategoria/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    const brandEntries: MetadataRoute.Sitemap = brands.map((b) => ({
      url: `${SITE_URL}/marki/${b.slug}`,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    const giftSetEntries: MetadataRoute.Sitemap = giftSets.map((g) => ({
      url: `${SITE_URL}/zestawy-prezentowe/${g.slug}`,
      lastModified: g.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [
      ...staticEntries,
      ...productEntries,
      ...categoryEntries,
      ...brandEntries,
      ...giftSetEntries,
    ];
  } catch {
    return staticEntries;
  }
}
