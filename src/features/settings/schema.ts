import { z } from "zod";

export const DEFAULT_ORDERS_PAUSED_MESSAGE_PL = "Sklep chwilowo nie przyjmuje zamówień.";

export const shopSettingsSchema = z.object({
  // Grosz; null switches free delivery off
  freeShippingThresholdPln: z.number().int().min(0).max(10_000_000).nullable(),
  // Short on purpose: it shares the ~155-char meta description with the product text
  productMetaSuffixPl: z.string().trim().max(40).nullable(),
  ordersPaused: z.boolean(),
  ordersPausedMessagePl: z.string().trim().max(160).nullable(),
});

export type ShopSettingsInput = z.input<typeof shopSettingsSchema>;
