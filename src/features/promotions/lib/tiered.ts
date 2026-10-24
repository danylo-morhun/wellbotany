import { z } from "zod";

// Cart-value discount („rabat progresywny”). The threshold counts the whole
// cart; the discount only lines not already on sale (no kaskada rabatowa).

export const tierSchema = z.object({
  minPln: z.number().int().min(100),
  percent: z.number().int().min(1).max(50),
});
export const tiersSchema = z.array(tierSchema).max(3);

export type Tier = z.infer<typeof tierSchema>;
export type TierPromo = {
  name: string;
  tiers: Tier[];
  // ISO strings: settings pass through unstable_cache, which JSON-serializes them
  startsAt: string | null;
  endsAt: string | null;
};

/** Parses the stored JSON; anything malformed means no promotion. */
export function parseTiers(raw: unknown): Tier[] {
  const parsed = tiersSchema.safeParse(raw);
  return parsed.success ? [...parsed.data].sort((a, b) => a.minPln - b.minPln) : [];
}

export function isTierPromoLive(promo: TierPromo | null, now = new Date()): promo is TierPromo {
  if (!promo || promo.tiers.length === 0) return false;
  if (promo.startsAt && now < new Date(promo.startsAt)) return false;
  if (promo.endsAt && now > new Date(promo.endsAt)) return false;
  return true;
}

/** Highest tier the cart reaches, or null. */
export function reachedTier(tiers: Tier[], subtotalPln: number): Tier | null {
  let best: Tier | null = null;
  for (const tier of tiers) if (subtotalPln >= tier.minPln) best = tier;
  return best;
}

/** Next tier above the current one, with how much is missing — for the cart nudge. */
export function nextTier(
  tiers: Tier[],
  subtotalPln: number,
): { tier: Tier; missingPln: number } | null {
  const tier = tiers.find((t) => subtotalPln < t.minPln);
  return tier ? { tier, missingPln: tier.minPln - subtotalPln } : null;
}

/** Discount in grosz: the reached tier's percent of the lines not on sale. */
export function tierDiscountPln(
  tiers: Tier[],
  subtotalPln: number,
  saleSubtotalPln: number,
): { discountPln: number; percent: number } {
  const tier = reachedTier(tiers, subtotalPln);
  const base = subtotalPln - saleSubtotalPln;
  if (!tier || base <= 0) return { discountPln: 0, percent: tier?.percent ?? 0 };
  return { discountPln: Math.round((base * tier.percent) / 100), percent: tier.percent };
}

/** Coupon and cart promotion never stack — the customer gets the bigger one (ties: the coupon). */
export function pickDiscount(couponPln: number, promoPln: number): "coupon" | "promo" | null {
  if (couponPln <= 0 && promoPln <= 0) return null;
  return couponPln >= promoPln ? "coupon" : "promo";
}

/** „5% od 150 zł · 10% od 250 zł” — for the banner and the cart. */
export function describeTiers(tiers: Tier[], format: (grosz: number) => string): string {
  return tiers.map((t) => `-${t.percent}% od ${format(t.minPln)}`).join(" · ");
}

export type CartDiscount = {
  discountPln: number;
  source: "coupon" | "promo" | null;
  /** Shown under the discount: which one won and why the other isn't counted */
  note: string | null;
};

/** What the cart and checkout show — the same rule the order action applies. */
export function cartDiscount(
  promo: TierPromo | null,
  subtotalPln: number,
  saleSubtotalPln: number,
  couponPln: number,
): CartDiscount {
  const promoPln = promo
    ? tierDiscountPln(promo.tiers, subtotalPln, saleSubtotalPln).discountPln
    : 0;
  const source = pickDiscount(couponPln, promoPln);
  if (source === "promo") {
    const notes = [
      couponPln > 0 ? `Rabat ${promo?.name} jest korzystniejszy — kod nie zostanie użyty.` : null,
      saleSubtotalPln > 0 ? "Rabat nie obejmuje produktów w promocji." : null,
    ].filter(Boolean);
    return { discountPln: promoPln, source, note: notes.join(" ") || null };
  }
  if (source === "coupon" && promoPln > 0)
    return {
      discountPln: couponPln,
      source,
      note: `Kod jest korzystniejszy niż rabat ${promo?.name} — rabaty się nie sumują.`,
    };
  return { discountPln: source ? couponPln : 0, source, note: null };
}
