"use server";

import { actionClient } from "@/lib/safe-action";
import { fetchProductsByIds, getSearchableProducts } from "./actions";
import { resolveDisplayBrand } from "./lib/brand-tree";
import { rankBySearchRelevance } from "./lib/search-relevance";
import { searchSuggestionsSchema } from "./schema";

const SUGGESTION_RESULT_TAKE = 8;

export const searchProductSuggestions = actionClient
  .schema(searchSuggestionsSchema)
  .action(async ({ parsedInput: { query } }) => {
    const candidates = await getSearchableProducts();
    const rankedIds = rankBySearchRelevance(candidates, query)
      .slice(0, SUGGESTION_RESULT_TAKE)
      .map((p) => p.id);
    const products = await fetchProductsByIds(rankedIds);

    return products.map((p) => ({
      slug: p.slug,
      namePl: p.namePl,
      brandName: p.brand ? resolveDisplayBrand(p.brand).name : null,
      image: p.images[0] ?? null,
      variant: p.variants[0] ?? null,
    }));
  });
