"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { HOME_BANNERS_TAG } from "./lib/banners";
import { deleteHomeBannerSchema, homeBannerSchema } from "./schema";

export const saveHomeBanner = adminActionClient
  .schema(homeBannerSchema)
  .action(async ({ parsedInput: input }) => {
    const { id, ...data } = input;
    if (id) {
      await prisma.homeBanner.update({ where: { id }, data });
    } else {
      await prisma.homeBanner.create({ data });
    }
    updateTag(HOME_BANNERS_TAG);
    revalidatePath("/admin/strona-glowna");
    return { success: true };
  });

export const deleteHomeBanner = adminActionClient
  .schema(deleteHomeBannerSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.homeBanner.delete({ where: { id } });
    updateTag(HOME_BANNERS_TAG);
    revalidatePath("/admin/strona-glowna");
    return { success: true };
  });
