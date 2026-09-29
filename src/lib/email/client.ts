import { Resend } from "resend";

let client: Resend | null = null;

/** Lazy singleton — avoids throwing at import time in environments without the key set. */
export function resendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL ?? "Well Botany <zamowienia@wellbotany.pl>";

/**
 * The SDK resolves with `{ error }` instead of throwing (bad key, unverified
 * domain, rate limit) — throw so callers' catch-and-log actually sees it.
 */
export async function sendEmail(
  resend: Resend,
  payload: Parameters<Resend["emails"]["send"]>[0],
): Promise<void> {
  const { error } = await resend.emails.send(payload);
  if (error) throw new Error(`Resend ${error.name}: ${error.message}`);
}
