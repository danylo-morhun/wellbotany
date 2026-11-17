"use server";

import { after } from "next/server";
import { z } from "zod";
import { ActionError } from "@/lib/action-error";
import { sendAlreadySubscribedEmail, sendWelcomeCouponEmail } from "@/lib/email/newsletter-emails";
import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, getClientIp, newsletterLimiter } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";
import { actionClient } from "@/lib/safe-action";
import { WELCOME_DISCOUNT_PERCENT } from "./lib/constants";
import { removeSubscriber } from "./lib/remove-subscriber";
import { createWelcomeCoupon } from "./lib/welcome-coupon";
import { subscribeSchema } from "./schema";

export const subscribeToNewsletter = actionClient
  .schema(subscribeSchema)
  .action(async ({ parsedInput: { email } }) => {
    await assertNotRateLimited(newsletterLimiter, await getClientIp());
    const normalized = email.toLowerCase();

    // Re-subscribing is not an error, but the welcome code goes out only once
    // per address — never shown on screen, so it can't be farmed with fake e-mails.
    const result = await prisma.$transaction(async (tx) => {
      const subscriber = await tx.newsletterSubscriber.upsert({
        where: { email: normalized },
        update: {},
        create: { email: normalized },
        select: { id: true, couponId: true },
      });
      if (subscriber.couponId) return "existing" as const;
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

    // A lost race (null) means the parallel request sends the welcome e-mail
    if (result === "existing" && (await claimAlreadySubscribedSlot(normalized))) {
      after(() =>
        sendAlreadySubscribedEmail({ email: normalized }).catch((err) => {
          console.error("[email] already-subscribed notice failed:", err);
        }),
      );
    }

    const coupon = result === "existing" ? null : result;
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

export const unsubscribeFromNewsletter = actionClient
  .schema(z.object({ email: z.string().email(), token: z.string().min(10).max(100) }))
  .action(async ({ parsedInput: { email, token } }) => {
    if (!(await removeSubscriber(email, token)))
      throw new ActionError("Link jest nieprawidłowy. Napisz do nas, a wypiszemy Cię ręcznie.");
    return { success: true };
  });

const ALREADY_SUBSCRIBED_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * At most one "already subscribed" e-mail per address per day, so the form
 * can't be used to flood someone's inbox. Without Redis (dev, tests) it sends;
 * if Redis errors it stays quiet — the notice is a courtesy, not required.
 */
async function claimAlreadySubscribedSlot(email: string): Promise<boolean> {
  if (!redis) return true;
  try {
    return (
      (await redis.incrWindow(`newsletter:already:${email}`, ALREADY_SUBSCRIBED_WINDOW_MS)) === 1
    );
  } catch {
    return false;
  }
}
