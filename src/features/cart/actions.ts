"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action";
import { CART_COOKIE_NAME, ensureCartId } from "./lib/session";
import { addToCartSchema, removeFromCartSchema, updateQuantitySchema } from "./schema";

export const addToCart = actionClient
  .schema(addToCartSchema)
  .action(async ({ parsedInput: { variantId, quantity } }) => {
    const cartId = await ensureCartId();
    await prisma.cartItem.upsert({
      where: {
        cartId_variantId_giftSetGroupId: { cartId, variantId, giftSetGroupId: "" },
      },
      update: { quantity: { increment: quantity } },
      create: { cartId, variantId, quantity },
    });
    revalidatePath("/", "layout");
    return { success: true };
  });

export const removeFromCart = actionClient
  .schema(removeFromCartSchema)
  .action(async ({ parsedInput: { cartItemId } }) => {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    revalidatePath("/", "layout");
    return { success: true };
  });

export const updateQuantity = actionClient
  .schema(updateQuantitySchema)
  .action(async ({ parsedInput: { cartItemId, quantity } }) => {
    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });
    revalidatePath("/", "layout");
    return { success: true };
  });

export const clearCart = actionClient.action(async () => {
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (cartId) {
    await prisma.cartItem.deleteMany({ where: { cartId } });
    revalidatePath("/", "layout");
  }
  return { success: true };
});
