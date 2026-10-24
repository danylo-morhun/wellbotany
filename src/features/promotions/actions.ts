"use server";

import { revalidatePath, updateTag } from "next/cache";
import { SHOP_SETTINGS_TAG } from "@/features/settings/lib/shop-settings";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { tierPromoSchema } from "./schema";

export const saveTierPromo = adminActionClient
  .schema(tierPromoSchema)
  .action(async ({ parsedInput: { name, tiers, startsAt, endsAt } }) => {
    const data = {
      tierPromoName: name,
      tierPromoTiers: name ? tiers : [],
      tierPromoStartsAt: name && startsAt ? new Date(startsAt) : null,
      tierPromoEndsAt: name && endsAt ? new Date(endsAt) : null,
    };
    await prisma.shopSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
    updateTag(SHOP_SETTINGS_TAG);
    // The banner sits in the header of every page, incl. statically rendered ones
    revalidatePath("/", "layout");
    return { success: true };
  });
