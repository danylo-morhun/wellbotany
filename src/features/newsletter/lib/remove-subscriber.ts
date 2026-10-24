import { prisma } from "@/lib/prisma";
import { isValidUnsubscribeToken } from "./unsubscribe";

/** Withdraws newsletter consent. False when the link is forged or broken. */
export async function removeSubscriber(email: string, token: string): Promise<boolean> {
  if (!email || !token || !isValidUnsubscribeToken(email, token)) return false;
  // Already removed counts as success — the link may be clicked twice
  await prisma.newsletterSubscriber.deleteMany({ where: { email: email.toLowerCase() } });
  return true;
}
