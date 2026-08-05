"use server";

import { actionClient } from "@/lib/safe-action";
import { getSearchableProducts } from "./actions";
import { rankBySearchRelevance } from "./lib/search-relevance";
import { searchSuggestionsSchema } from "./schema";

const SUGGESTION_RESULT_TAKE = 8;

export const searchProductSuggestions = actionClient
  .schema(searchSuggestionsSchema)
  .action(async ({ parsedInput: { query } }) => {
    const candidates = await getSearchableProducts();
    const ranked = rankBySearchRelevance(candidates, query).slice(0, SUGGESTION_RESULT_TAKE);

    return ranked.map((p) => ({
      slug: p.slug,
      namePl: p.namePl,
      brandName: p.brand?.name ?? null,
      image: p.images[0] ?? null,
      variant: p.variants[0] ?? null,
    }));
  });
