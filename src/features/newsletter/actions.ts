"use server";

import { after } from "next/server";
import { sendWelcomeCouponEmail } from "@/lib/email/newsletter-emails";
import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, getClientIp, newsletterLimiter } from "@/lib/rate-limit";
import { actionClient } from "@/lib/safe-action";
import { WELCOME_DISCOUNT_PERCENT } from "./lib/constants";
import { createWelcomeCoupon } from "./lib/welcome-coupon";
import { subscribeSchema } from "./schema";

export const subscribeToNewsletter = actionClient
  .schema(subscribeSchema)
  .action(async ({ parsedInput: { email } }) => {
    await assertNotRateLimited(newsletterLimiter, await getClientIp());
    const normalized = email.toLowerCase();

    // Re-subscribing is not an error, but the welcome code goes out only once
    // per address — never shown on screen, so it can't be farmed with fake e-mails.
    const coupon = await prisma.$transaction(async (tx) => {
      const subscriber = await tx.newsletterSubscriber.upsert({
        where: { email: normalized },
        update: {},
        create: { email: normalized },
        select: { id: true, couponId: true },
      });
      if (subscriber.couponId) return null;
      const created = await createWelcomeCoupon(tx);
      // Conditional claim: a parallel sign-up for the same address loses the race
      const claimed = await tx.newsletterSubscriber.updateMany({
        where: { id: subscriber.id, couponId: null },
        data: { couponId: created.id },
      });
      if (claimed.count === 0) {
        await tx.coupon.delete({ where: { id: created.id } });
        return null;
      }
      return created;
    });

    if (coupon?.validUntil) {
      const { code, validUntil } = coupon;
      after(() =>
        sendWelcomeCouponEmail({
          email: normalized,
          code,
          percent: WELCOME_DISCOUNT_PERCENT,
          validUntil,
        }).catch((err) => {
          console.error(`[email] welcome coupon failed for ${code}:`, err);
        }),
      );
    }
    return { success: true };
  });
