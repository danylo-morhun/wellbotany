import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const removeFromCartSchema = z.object({
  cartItemId: z.string().min(1),
});

export const updateQuantitySchema = z.object({
  cartItemId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const removeGiftSetFromCartSchema = z.object({
  giftSetGroupId: z.string().min(1),
});
