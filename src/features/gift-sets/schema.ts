import { GiftBuilderPricingMode, ProductStatus } from "@prisma/client";
import { z } from "zod";

// ─── Admin: curated gift sets ──────────────────────────────────────────────────

export const giftSetItemInputSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const giftSetSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).max(200),
  status: z.nativeEnum(ProductStatus).default("DRAFT"),
  namePl: z.string().min(1).max(300),
  nameEn: z.string().max(300).optional(),
  nameUk: z.string().max(300).optional(),
  descriptionPl: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  pricePln: z.coerce.number().int().positive(),
  comparePricePln: z.coerce.number().int().positive().optional(),
  isFeatured: z.boolean().default(false),
  items: z.array(giftSetItemInputSchema).min(1, "Zestaw musi zawierać co najmniej 1 produkt"),
});

export const deleteGiftSetSchema = z.object({ id: z.string().min(1) });

export const searchVariantsSchema = z.object({
  query: z.string().min(1).max(200),
});

// ─── Admin: custom builder policy ──────────────────────────────────────────────

export const giftBuilderSettingsSchema = z
  .object({
    isActive: z.boolean().default(true),
    namePl: z.string().min(1).max(200).default("Zestaw prezentowy"),
    pricingMode: z.nativeEnum(GiftBuilderPricingMode).default("FIXED_BOX"),
    boxPricePln: z.coerce.number().int().positive().optional(),
    packagingFeePln: z.coerce.number().int().min(0).default(0),
    minItems: z.coerce.number().int().min(1).max(50).default(3),
    maxItems: z.coerce.number().int().min(1).max(50).default(8),
  })
  .refine((v) => v.pricingMode !== "FIXED_BOX" || v.boxPricePln !== undefined, {
    message: "Cena pudełka jest wymagana dla trybu stałej ceny",
    path: ["boxPricePln"],
  })
  .refine((v) => v.minItems <= v.maxItems, {
    message: "Minimalna liczba produktów nie może przekraczać maksymalnej",
    path: ["minItems"],
  });

// ─── Customer: add to cart ─────────────────────────────────────────────────────

export const addCuratedGiftSetToCartSchema = z.object({
  giftSetId: z.string().min(1),
});

export const addCustomGiftSetToCartSchema = z.object({
  items: z
    .array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
});
