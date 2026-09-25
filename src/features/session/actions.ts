"use server";

import { cookies } from "next/headers";
import { CART_COOKIE_NAME, getCart, getCartByCustomerId } from "@/features/cart/lib/session";
import { getWishlist, WISHLIST_COOKIE_NAME } from "@/features/wishlist/lib/session";
import { auth } from "@/lib/auth";

/**
 * Per-visitor header state (cart, wishlist, admin). Loaded from the client
 * after hydration so storefront pages carry no session/cookie reads and stay
 * static — reading them during render would make every page dynamic.
 */
export async function getStorefrontSession() {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value;
  const wishlistId = cookieStore.get(WISHLIST_COOKIE_NAME)?.value;

  const [cart, wishlist] = await Promise.all([
    session?.user?.id ? getCartByCustomerId(session.user.id) : cartId ? getCart(cartId) : null,
    wishlistId ? getWishlist(wishlistId) : null,
  ]);

  return {
    isAdmin: session?.user?.role === "ADMIN",
    cartItems: cart?.items ?? [],
    wishlistItems: wishlist?.items ?? [],
  };
}

export type StorefrontSession = Awaited<ReturnType<typeof getStorefrontSession>>;
