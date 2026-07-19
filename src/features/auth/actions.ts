"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { CART_COOKIE_NAME, mergeGuestCart } from "@/features/cart/lib/session";
import { mergeGuestWishlist, WISHLIST_COOKIE_NAME } from "@/features/wishlist/lib/session";
import { ActionError } from "@/lib/action-error";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, getClientIp, loginLimiter, registerLimiter } from "@/lib/rate-limit";
import { actionClient } from "@/lib/safe-action";
import { loginSchema, registerSchema } from "./schema";

export const loginCustomer = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput: input }) => {
    await assertNotRateLimited(loginLimiter, `${await getClientIp()}:${input.email}`);

    // Verify credentials before signIn to allow pre-signIn merge
    const customer = await prisma.customer.findUnique({
      where: { email: input.email },
      select: { id: true, passwordHash: true },
    });
    if (!customer?.passwordHash) {
      throw new ActionError("Nieprawidłowy e-mail lub hasło");
    }
    const valid = await bcrypt.compare(input.password, customer.passwordHash);
    if (!valid) throw new ActionError("Nieprawidłowy e-mail lub hasło");

    // Merge guest cart/wishlist before signIn redirect
    const cookieStore = await cookies();
    const guestCartId = cookieStore.get(CART_COOKIE_NAME)?.value;
    const guestWishlistId = cookieStore.get(WISHLIST_COOKIE_NAME)?.value;
    if (guestCartId) await mergeGuestCart(guestCartId, customer.id);
    if (guestWishlistId) await mergeGuestWishlist(guestWishlistId, customer.id);

    try {
      await signIn("credentials", {
        email: input.email,
        password: input.password,
        redirectTo: input.callbackUrl ?? "/konto",
      });
    } catch (err) {
      if (err instanceof AuthError) throw new ActionError("Nieprawidłowy e-mail lub hasło");
      throw err; // NEXT_REDIRECT — must rethrow
    }
  });

export const registerCustomer = actionClient
  .schema(registerSchema)
  .action(async ({ parsedInput: input }) => {
    await assertNotRateLimited(registerLimiter, await getClientIp());

    const existing = await prisma.customer.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) throw new ActionError("Konto z tym adresem e-mail już istnieje");

    const passwordHash = await bcrypt.hash(input.password, 12);
    await prisma.customer.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
      },
    });

    // Auto-login after register
    try {
      await signIn("credentials", {
        email: input.email,
        password: input.password,
        redirectTo: "/konto",
      });
    } catch (err) {
      if (err instanceof AuthError) throw new ActionError("Błąd logowania po rejestracji");
      throw err; // NEXT_REDIRECT — must rethrow
    }
  });
