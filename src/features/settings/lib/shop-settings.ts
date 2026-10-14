import { unstable_cache } from "next/cache";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ORDERS_PAUSED_MESSAGE_PL } from "../schema";

export const SHOP_SETTINGS_TAG = "shop-settings";

const DEFAULT_FREE_SHIPPING_THRESHOLD_PLN = 20000;
const DEFAULT_PRODUCT_META_SUFFIX_PL = "Wysyłka w 24–48 h.";

export type ShopSettings = {
  /** Grosz; null = free delivery disabled */
  freeShippingThresholdPln: number | null;
  /** Appended to product meta descriptions; null = nothing appended */
  productMetaSuffixPl: string | null;
  /** Nothing can be bought while true; pages stay indexable */
  ordersPaused: boolean;
  /** Banner text shown while paused; null = default message */
  ordersPausedMessagePl: string | null;
};

export const getShopSettings = unstable_cache(
  async (): Promise<ShopSettings> => {
    const row = await prisma.shopSettings.findUnique({ where: { id: 1 } });
    return {
      freeShippingThresholdPln: row
        ? row.freeShippingThresholdPln
        : DEFAULT_FREE_SHIPPING_THRESHOLD_PLN,
      productMetaSuffixPl: row ? row.productMetaSuffixPl : DEFAULT_PRODUCT_META_SUFFIX_PL,
      ordersPaused: row?.ordersPaused ?? false,
      ordersPausedMessagePl: row?.ordersPausedMessagePl ?? null,
    };
  },
  ["shop-settings"],
  { tags: [SHOP_SETTINGS_TAG] },
);

export function ordersPausedMessage(settings: ShopSettings): string {
  return settings.ordersPausedMessagePl ?? DEFAULT_ORDERS_PAUSED_MESSAGE_PL;
}

/** Guard for every action that adds to the cart or places an order. */
export async function assertOrdersOpen(): Promise<void> {
  const settings = await getShopSettings();
  if (settings.ordersPaused) throw new ActionError(ordersPausedMessage(settings));
}
