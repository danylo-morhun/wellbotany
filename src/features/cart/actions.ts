"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action";
import { CART_COOKIE_NAME, CART_TTL_DAYS, createGuestCart } from "./lib/session";
import { addToCartSchema, removeFromCartSchema, updateQuantitySchema } from "./schema";

async function ensureCartId(): Promise<string> {
  // Logged-in users: use/create their customer cart
  const session = await auth();
  if (session?.user?.id) {
    const existing = await prisma.cart.findUnique({
      where: { customerId: session.user.id },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.cart.create({
      data: { customerId: session.user.id },
      select: { id: true },
    });
    return created.id;
  }

  // Guest users: use cart_id cookie
  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (cartId) {
    const exists = await prisma.cart.findFirst({
      where: {
        id: cartId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (exists) return exists.id;
  }

  const newId = await createGuestCart();
  cookieStore.set(CART_COOKIE_NAME, newId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_TTL_DAYS * 24 * 60 * 60,
  });
  return newId;
}

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
