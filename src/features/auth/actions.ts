"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { openTotpSecret, verifyTotp } from "@/features/auth/lib/totp";
import { CART_COOKIE_NAME, mergeGuestCart } from "@/features/cart/lib/session";
import { mergeGuestWishlist, WISHLIST_COOKIE_NAME } from "@/features/wishlist/lib/session";
import { ActionError } from "@/lib/action-error";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, getClientIp, loginLimiter, registerLimiter } from "@/lib/rate-limit";
import { actionClient } from "@/lib/safe-action";
import { loginSchema, registerSchema } from "./schema";

// /konto only redirects to /konto/profil; a sign-in redirect that lands on a
// second redirect leaves the client on the form showing a generic error.
const ACCOUNT_HOME = "/konto/profil";
// Only same-site paths: "//host" and "/\\host" are protocol-relative URLs to another site
const isLocalPath = (url: string) => url.startsWith("/") && !/^\/[/\\]/.test(url);
const afterSignIn = (callbackUrl?: string) =>
  !callbackUrl || callbackUrl === "/konto" || !isLocalPath(callbackUrl)
    ? ACCOUNT_HOME
    : callbackUrl;

export const loginCustomer = actionClient
  .schema(loginSchema)
  .action(async ({ parsedInput: input }) => {
    await assertNotRateLimited(loginLimiter, `${await getClientIp()}:${input.email}`);

    // Verify credentials before signIn to allow pre-signIn merge
    const customer = await prisma.customer.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        passwordHash: true,
        isAdmin: true,
        totpSecret: true,
        totpEnabledAt: true,
        totpLastStep: true,
      },
    });
    if (!customer?.passwordHash) {
      throw new ActionError("Nieprawidłowy e-mail lub hasło");
    }
    const valid = await bcrypt.compare(input.password, customer.passwordHash);
    if (!valid) throw new ActionError("Nieprawidłowy e-mail lub hasło");

    // Admins with TOTP: password first, then the form asks for the code. The
    // check here only gives a clear message — authorize() enforces it again.
    const totpOn = customer.isAdmin && customer.totpEnabledAt && customer.totpSecret;
    if (totpOn && !input.code) return { needsCode: true as const };
    if (
      totpOn &&
      input.code &&
      verifyTotp(
        openTotpSecret(customer.totpSecret as string),
        input.code,
        customer.totpLastStep,
      ) === null
    ) {
      throw new ActionError("Nieprawidłowy lub już użyty kod — wpisz aktualny kod z aplikacji");
    }

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
        code: input.code ?? "",
        // An admin without TOTP has no admin rights until it is set up
        redirectTo: customer.isAdmin && !totpOn ? "/logowanie/2fa" : afterSignIn(input.callbackUrl),
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
        redirectTo: ACCOUNT_HOME,
      });
    } catch (err) {
      if (err instanceof AuthError) throw new ActionError("Błąd logowania po rejestracji");
      throw err; // NEXT_REDIRECT — must rethrow
    }
  });
