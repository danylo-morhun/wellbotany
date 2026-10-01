import { z } from "zod";

export const adminSearchSchema = z.object({ query: z.string().trim().min(2).max(100) });
