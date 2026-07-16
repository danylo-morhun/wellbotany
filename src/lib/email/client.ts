import { Resend } from "resend";

let client: Resend | null = null;

/** Lazy singleton — avoids throwing at import time in environments without the key set. */
export function resendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL ?? "Twoje Zdrowie <zamowienia@twojezdrowie.pl>";
