"use server";

import QRCode from "qrcode";
import { z } from "zod";
import { loginPath } from "@/features/auth/lib/login-path";
import { ActionError } from "@/lib/action-error";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, loginLimiter } from "@/lib/rate-limit";
import { actionClient } from "@/lib/safe-action";
import {
  generateTotpSecret,
  openTotpSecret,
  otpauthUri,
  sealTotpSecret,
  verifyTotp,
} from "./lib/totp";

/** The signed-in admin who still has to set up TOTP — anyone else is refused */
async function pendingAdmin() {
  const session = await auth();
  if (!session?.user?.id || !session.user.totpSetup) throw new ActionError("Brak dostępu");
  const customer = await prisma.customer.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, isAdmin: true, totpEnabledAt: true, totpSecret: true },
  });
  if (!customer?.isAdmin) throw new ActionError("Brak dostępu");
  if (customer.totpEnabledAt) throw new ActionError("Weryfikacja dwuetapowa jest już włączona");
  return customer;
}

/** New secret (replaces an unconfirmed one) + QR for the authenticator app */
export const startTotpSetup = actionClient.action(async () => {
  const customer = await pendingAdmin();
  const secret = generateTotpSecret();
  await prisma.customer.update({
    where: { id: customer.id },
    data: { totpSecret: sealTotpSecret(secret), totpLastStep: null },
  });
  const qr = await QRCode.toDataURL(otpauthUri(secret, customer.email), { margin: 1, width: 240 });
  return { qr, secret: secret.match(/.{1,4}/g)?.join(" ") ?? secret };
});

/** The first code proves the app holds the secret; then sign in again with it */
export const confirmTotpSetup = actionClient
  .schema(z.object({ code: z.string().regex(/^\d{3} ?\d{3}$/, "Kod ma 6 cyfr") }))
  .action(async ({ parsedInput: { code } }) => {
    const customer = await pendingAdmin();
    await assertNotRateLimited(loginLimiter, `totp-setup:${customer.id}`);
    if (!customer.totpSecret) throw new ActionError("Najpierw wygeneruj kod QR");
    const step = verifyTotp(openTotpSecret(customer.totpSecret), code);
    if (step === null)
      throw new ActionError("Kod się nie zgadza — sprawdź godzinę w telefonie i spróbuj ponownie");
    await prisma.customer.update({
      where: { id: customer.id },
      data: { totpEnabledAt: new Date(), totpLastStep: step },
    });
    // The current session carries no admin rights — sign in again with a code
    await signOut({ redirectTo: `${await loginPath()}?2fa=wlaczona` });
  });
