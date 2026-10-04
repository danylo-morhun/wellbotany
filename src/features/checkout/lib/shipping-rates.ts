import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CARRIERS, type ShippingMethodKey, type ShippingRate, sortRates } from "./shipping";

export const SHIPPING_RATES_TAG = "shipping-rates";

/** Methods the checkout offers, cheapest first. */
export const getShippingRates = unstable_cache(
  async (): Promise<ShippingRate[]> => {
    const rows = await prisma.shippingRate.findMany({ where: { enabled: true } });
    return sortRates(
      rows
        .filter((r) => r.method in CARRIERS)
        .map((r) => ({ method: r.method as ShippingMethodKey, pricePln: r.pricePln })),
    );
  },
  ["shipping-rates"],
  { tags: [SHIPPING_RATES_TAG] },
);
