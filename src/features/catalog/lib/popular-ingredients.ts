import { unstable_cache } from "next/cache";
import { GLOSSARY_TAG } from "@/features/glossary/lib/queries";
import { prisma } from "@/lib/prisma";

import { type IngredientChip, rankIngredientsByProducts } from "./ingredient-rank";

const CHIP_LIMIT = 8;

/** Chips under the header search on the home page. */
export const getPopularIngredients = unstable_cache(
  async (): Promise<IngredientChip[]> => {
    const [ingredients, products] = await Promise.all([
      prisma.ingredient.findMany({
        where: { isPublished: true },
        select: { slug: true, namePl: true, matchTerms: true, excludeTerms: true },
      }),
      prisma.product.findMany({ where: { status: "ACTIVE" }, select: { namePl: true } }),
    ]);
    return rankIngredientsByProducts(
      ingredients,
      products.map((p) => p.namePl),
      CHIP_LIMIT,
    );
  },
  ["popular-ingredients"],
  { tags: [GLOSSARY_TAG, "products"] },
);
