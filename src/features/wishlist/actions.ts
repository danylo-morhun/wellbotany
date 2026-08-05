"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action";
import { createGuestWishlist, WISHLIST_COOKIE_NAME, WISHLIST_TTL_DAYS } from "./lib/session";
import { removeFromWishlistSchema, toggleWishlistSchema } from "./schema";

async function ensureWishlistId(): Promise<string> {
  const cookieStore = await cookies();
  const wishlistId = cookieStore.get(WISHLIST_COOKIE_NAME)?.value;

  if (wishlistId) {
    const exists = await prisma.wishlist.findFirst({
      where: {
        id: wishlistId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });
    if (exists) return exists.id;
  }

  const newId = await createGuestWishlist();
  cookieStore.set(WISHLIST_COOKIE_NAME, newId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: WISHLIST_TTL_DAYS * 24 * 60 * 60,
  });
  return newId;
}

export const toggleWishlist = actionClient
  .schema(toggleWishlistSchema)
  .action(async ({ parsedInput: { productId } }) => {
    const wishlistId = await ensureWishlistId();

    const existing = await prisma.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId, productId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { added: false };
    }

    await prisma.wishlistItem.create({ data: { wishlistId, productId } });
    return { added: true };
  });

export const removeFromWishlist = actionClient
  .schema(removeFromWishlistSchema)
  .action(async ({ parsedInput: { wishlistItemId } }) => {
    await prisma.wishlistItem.delete({ where: { id: wishlistItemId } });
    return { success: true };
  });

export const clearWishlist = actionClient.action(async () => {
  const cookieStore = await cookies();
  const wishlistId = cookieStore.get(WISHLIST_COOKIE_NAME)?.value;
  if (wishlistId) {
    await prisma.wishlistItem.deleteMany({ where: { wishlistId } });
  }
  return { success: true };
});
