"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { SHOP_SETTINGS_TAG } from "./lib/shop-settings";
import { shopSettingsSchema } from "./schema";

export const saveShopSettings = adminActionClient
  .schema(shopSettingsSchema)
  .action(async ({ parsedInput: input }) => {
    await prisma.shopSettings.upsert({
      where: { id: 1 },
      update: input,
      create: { id: 1, ...input },
    });
    updateTag(SHOP_SETTINGS_TAG);
    // Threshold is shown in the header on every page, incl. statically rendered ones
    revalidatePath("/", "layout");
    return { success: true };
  });
