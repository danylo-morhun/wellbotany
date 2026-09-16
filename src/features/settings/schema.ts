import { z } from "zod";

export const shopSettingsSchema = z.object({
  // Grosz; null switches free delivery off
  freeShippingThresholdPln: z.number().int().min(0).max(10_000_000).nullable(),
});

export type ShopSettingsInput = z.input<typeof shopSettingsSchema>;
