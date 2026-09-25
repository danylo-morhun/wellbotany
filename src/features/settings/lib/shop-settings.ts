import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const SHOP_SETTINGS_TAG = "shop-settings";

const DEFAULT_FREE_SHIPPING_THRESHOLD_PLN = 20000;
const DEFAULT_PRODUCT_META_SUFFIX_PL = "Wysyłka w 24–48 h.";

export type ShopSettings = {
  /** Grosz; null = free delivery disabled */
  freeShippingThresholdPln: number | null;
  /** Appended to product meta descriptions; null = nothing appended */
  productMetaSuffixPl: string | null;
};

export const getShopSettings = unstable_cache(
  async (): Promise<ShopSettings> => {
    const row = await prisma.shopSettings.findUnique({ where: { id: 1 } });
    return {
      freeShippingThresholdPln: row
        ? row.freeShippingThresholdPln
        : DEFAULT_FREE_SHIPPING_THRESHOLD_PLN,
      productMetaSuffixPl: row ? row.productMetaSuffixPl : DEFAULT_PRODUCT_META_SUFFIX_PL,
    };
  },
  ["shop-settings"],
  { tags: [SHOP_SETTINGS_TAG] },
);
