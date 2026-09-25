import { z } from "zod";

export const REVIEW_MIN_LENGTH = 10;

export const submitReviewsSchema = z.object({
  token: z.string().min(20).max(100),
  authorName: z.string().trim().min(2, "Podaj imię").max(40),
  reviews: z
    .array(
      z.object({
        productId: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        content: z
          .string()
          .trim()
          .min(REVIEW_MIN_LENGTH, `Napisz co najmniej ${REVIEW_MIN_LENGTH} znaków`)
          .max(2000),
      }),
    )
    .min(1, "Oceń co najmniej jeden produkt")
    .max(50),
});

export const moderateReviewSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const requestReviewSchema = z.object({ orderId: z.string().min(1) });

export type SubmitReviewsInput = z.input<typeof submitReviewsSchema>;
