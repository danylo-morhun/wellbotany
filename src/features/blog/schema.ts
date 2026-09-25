import { z } from "zod";

export const savePostSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Tylko małe litery, cyfry i myślniki"),
  titlePl: z.string().trim().min(5).max(200),
  excerptPl: z.string().trim().min(20).max(300),
  metaTitlePl: z.string().trim().max(70).optional(),
  metaDescPl: z.string().trim().max(170).optional(),
  contentPl: z.string().min(50).max(60000),
  faqPl: z
    .array(z.object({ q: z.string().min(1).max(300), a: z.string().min(1).max(2000) }))
    .max(20),
  coverImage: z.string().url().optional().or(z.literal("")),
  categorySlug: z.string().max(120).optional(),
  reviewedBy: z.string().trim().max(120).optional(),
  isPublished: z.boolean(),
});

export const deletePostSchema = z.object({ id: z.string().min(1) });

export type SavePostInput = z.input<typeof savePostSchema>;
