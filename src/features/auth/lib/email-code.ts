// Admin 2FA by e-mail: after the password, a one-time 6-digit code goes to the
// account's address. Stored only as an HMAC (keyed by AUTH_SECRET), valid for
// 10 minutes, 5 wrong tries burn it, used once.
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { EMAIL_FROM, resendClient, sendEmail } from "@/lib/email/client";
import { layout } from "@/lib/email/layout";
import { prisma } from "@/lib/prisma";

export const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
// A fresh code at most once a minute — a second "Zaloguj się" reuses the sent one
const RESEND_AFTER_MS = 60 * 1000;

export function hashEmailCode(customerId: string, code: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`email-2fa:${customerId}:${code}`).digest("hex");
}

const normalize = (code: string) => code.replace(/\s/g, "");

/** Sends a new code unless a recent one is still valid. */
export async function sendEmailCode(customer: { id: string; email: string }): Promise<void> {
  const now = Date.now();
  const current = await prisma.customer.findUnique({
    where: { id: customer.id },
    select: { emailCodeHash: true, emailCodeSentAt: true, emailCodeExpiresAt: true },
  });
  if (
    current?.emailCodeHash &&
    current.emailCodeSentAt &&
    current.emailCodeExpiresAt &&
    now - current.emailCodeSentAt.getTime() < RESEND_AFTER_MS &&
    current.emailCodeExpiresAt.getTime() > now
  ) {
    return;
  }

  const resend = resendClient();
  if (!resend) throw new Error("RESEND_API_KEY is not set — cannot send the login code");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      emailCodeHash: hashEmailCode(customer.id, code),
      emailCodeSentAt: new Date(now),
      emailCodeExpiresAt: new Date(now + EMAIL_CODE_TTL_MS),
      emailCodeAttempts: 0,
    },
  });

  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  await sendEmail(resend, {
    from: EMAIL_FROM,
    to: customer.email,
    subject: `Kod logowania do panelu: ${spaced}`,
    html: layout(
      "Kod logowania",
      `<p>Twój kod do panelu Well Botany:</p>
       <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${spaced}</p>
       <p>Kod jest ważny 10 minut i działa tylko raz.</p>
       <p style="color:#666">Jeśli to nie Ty logujesz się do panelu, zignoruj tę wiadomość i zmień hasło.</p>`,
    ),
  });
}

type StoredCode = {
  id: string;
  emailCodeHash: string | null;
  emailCodeExpiresAt: Date | null;
  emailCodeAttempts: number;
};

/** Read-only check; counts a wrong try. */
export async function checkEmailCode(customer: StoredCode, code: string): Promise<boolean> {
  if (
    !customer.emailCodeHash ||
    !customer.emailCodeExpiresAt ||
    customer.emailCodeExpiresAt.getTime() <= Date.now() ||
    customer.emailCodeAttempts >= EMAIL_CODE_MAX_ATTEMPTS
  ) {
    return false;
  }
  const given = normalize(code);
  const ok =
    /^\d{6}$/.test(given) &&
    timingSafeEqual(
      Buffer.from(hashEmailCode(customer.id, given)),
      Buffer.from(customer.emailCodeHash),
    );
  if (!ok) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { emailCodeAttempts: { increment: 1 } },
    });
  }
  return ok;
}

/** Consumes the code atomically — the same code can't sign in twice. */
export async function consumeEmailCode(customerId: string, code: string): Promise<boolean> {
  const given = normalize(code);
  if (!/^\d{6}$/.test(given)) return false;
  const { count } = await prisma.customer.updateMany({
    where: {
      id: customerId,
      emailCodeHash: hashEmailCode(customerId, given),
      emailCodeExpiresAt: { gt: new Date() },
      emailCodeAttempts: { lt: EMAIL_CODE_MAX_ATTEMPTS },
    },
    data: { emailCodeHash: null, emailCodeExpiresAt: null, emailCodeAttempts: 0 },
  });
  return count === 1;
}
