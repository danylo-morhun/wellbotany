"use server";

import { revalidatePath } from "next/cache";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { couponIdSchema, couponSchema, toggleCouponSchema } from "./schema";

export const saveCoupon = adminActionClient
  .schema(couponSchema)
  .action(async ({ parsedInput: { id, ...data } }) => {
    if (id) await prisma.coupon.update({ where: { id }, data });
    else await prisma.coupon.create({ data });
    revalidatePath("/admin/kupony");
    return { success: true };
  });

export const toggleCoupon = adminActionClient
  .schema(toggleCouponSchema)
  .action(async ({ parsedInput: { id, isActive } }) => {
    await prisma.coupon.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/kupony");
    return { success: true };
  });

export const deleteCoupon = adminActionClient
  .schema(couponIdSchema)
  .action(async ({ parsedInput: { id } }) => {
    const used = await prisma.order.count({ where: { couponId: id } });
    // Orders keep a link to the coupon — used codes can only be switched off
    if (used > 0) throw new ActionError("Kod był już użyty w zamówieniach — możesz go wyłączyć");
    await prisma.coupon.delete({ where: { id } });
    revalidatePath("/admin/kupony");
    return { success: true };
  });
