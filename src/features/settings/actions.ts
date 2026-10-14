"use server";

import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { syncAllToMerchant } from "@/lib/merchant";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { getShopSettings, SHOP_SETTINGS_TAG } from "./lib/shop-settings";
import { shopSettingsSchema } from "./schema";

export const saveShopSettings = adminActionClient
  .schema(shopSettingsSchema)
  .action(async ({ parsedInput: input }) => {
    const wasPaused = (await getShopSettings()).ordersPaused;
    await prisma.shopSettings.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input },
    });
    updateTag(SHOP_SETTINGS_TAG);
    // Threshold is shown in the header on every page, incl. statically rendered ones
    revalidatePath("/", "layout");
    if (input.ordersPaused !== wasPaused) {
      // Availability flips for every offer — tell Google now, not at the next daily fetch
      revalidatePath("/product-feed.xml");
      after(() => syncAllToMerchant().catch(console.error));
    }
    return { success: true };
  });
