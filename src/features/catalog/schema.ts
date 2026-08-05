import { z } from "zod";

export const searchSuggestionsSchema = z.object({
  query: z.string().min(2).max(100),
});
