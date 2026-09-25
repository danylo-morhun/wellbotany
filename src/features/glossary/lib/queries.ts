import { unstable_cache } from "next/cache";
import { PRODUCT_LIST_SELECT } from "@/features/catalog/actions";
import { prisma } from "@/lib/prisma";

export const GLOSSARY_TAG = "ingredients";

export type FaqRow = { q: string; a: string };

export function readFaq(value: unknown): FaqRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is FaqRow => typeof row?.q === "string" && typeof row?.a === "string",
  );
}

export const getIngredients = unstable_cache(
  async () =>
    prisma.ingredient.findMany({
      where: { isPublished: true },
      orderBy: { namePl: "asc" },
      select: { slug: true, namePl: true, shortPl: true, updatedAt: true },
    }),
  ["ingredients"],
  { tags: [GLOSSARY_TAG] },
);

export const getIngredientBySlug = unstable_cache(
  async (slug: string) => prisma.ingredient.findFirst({ where: { slug, isPublished: true } }),
  ["ingredient-by-slug"],
  { tags: [GLOSSARY_TAG] },
);

const PRODUCTS_PER_INGREDIENT = 12;

/** Active products whose name contains one of the ingredient's match terms. */
export const getIngredientProducts = unstable_cache(
  async (matchTerms: string[], excludeTerms: string[]) => {
    if (matchTerms.length === 0) return { items: [], total: 0 };
    const where = {
      status: "ACTIVE" as const,
      OR: matchTerms.map((t) => ({ namePl: { contains: t, mode: "insensitive" as const } })),
      NOT: excludeTerms.map((t) => ({ namePl: { contains: t, mode: "insensitive" as const } })),
    };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: PRODUCT_LIST_SELECT,
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        take: PRODUCTS_PER_INGREDIENT,
      }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  },
  ["ingredient-products"],
  { tags: [GLOSSARY_TAG, "products"] },
);

/** Terms → ingredient page, for linking nutrition-table rows on product pages. */
export const getIngredientLinkIndex = unstable_cache(
  async () =>
    (
      await prisma.ingredient.findMany({
        where: { isPublished: true },
        select: { slug: true, matchTerms: true, excludeTerms: true },
      })
    ).map((i) => ({ slug: i.slug, terms: i.matchTerms, exclude: i.excludeTerms })),
  ["ingredient-link-index"],
  { tags: [GLOSSARY_TAG] },
);
