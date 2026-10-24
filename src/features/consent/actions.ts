"use server";

import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, consentLimiter, getClientIp } from "@/lib/rate-limit";
import { actionClient } from "@/lib/safe-action";
import { recordConsentSchema } from "./schema";

/** Logs a cookie banner choice (proof of consent for Google / Meta, RODO art. 7 ust. 1). */
export const recordConsent = actionClient
  .schema(recordConsentSchema)
  .action(async ({ parsedInput }) => {
    await assertNotRateLimited(consentLimiter, await getClientIp());
    await prisma.consentLog.create({ data: parsedInput });
  });
