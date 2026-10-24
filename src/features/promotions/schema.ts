import { z } from "zod";
import { tiersSchema } from "./lib/tiered";

export const tierPromoSchema = z
  .object({
    // null switches the promotion off
    name: z.string().trim().min(2).max(40).nullable(),
    tiers: tiersSchema,
    startsAt: z.string().datetime().nullable(),
    endsAt: z.string().datetime().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.name === null) return;
    if (data.tiers.length === 0)
      ctx.addIssue({ code: "custom", path: ["tiers"], message: "Dodaj co najmniej jeden próg" });
    const sorted = [...data.tiers].sort((a, b) => a.minPln - b.minPln);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].minPln === sorted[i - 1].minPln || sorted[i].percent <= sorted[i - 1].percent)
        ctx.addIssue({
          code: "custom",
          path: ["tiers"],
          message: "Wyższy próg musi dawać większy rabat",
        });
    }
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt)
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Koniec musi być po początku" });
  });

export type TierPromoInput = z.input<typeof tierPromoSchema>;
