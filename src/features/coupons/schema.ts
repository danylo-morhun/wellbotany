import { z } from "zod";

export const couponSchema = z
  .object({
    id: z.string().optional(),
    code: z
      .string()
      .trim()
      .min(3, "Kod musi mieć co najmniej 3 znaki")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Tylko litery, cyfry, - i _")
      .transform((c) => c.toUpperCase()),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    // PERCENTAGE: 1–100; FIXED_AMOUNT: grosz
    value: z.number().int().positive(),
    minOrderPln: z.number().int().positive().nullable(),
    maxUsages: z.number().int().positive().nullable(),
    validFrom: z.coerce.date().nullable(),
    validUntil: z.coerce.date().nullable(),
    isActive: z.boolean(),
  })
  .refine((c) => c.type !== "PERCENTAGE" || c.value <= 100, {
    message: "Rabat procentowy nie może przekraczać 100%",
    path: ["value"],
  })
  .refine((c) => !c.validFrom || !c.validUntil || c.validFrom < c.validUntil, {
    message: "Data końca musi być po dacie początku",
    path: ["validUntil"],
  });

export type CouponInput = z.input<typeof couponSchema>;

export const couponIdSchema = z.object({ id: z.string().min(1) });
export const toggleCouponSchema = z.object({ id: z.string().min(1), isActive: z.boolean() });
