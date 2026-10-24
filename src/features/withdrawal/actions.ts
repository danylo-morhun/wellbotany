"use server";

import { after } from "next/server";
import { ActionError } from "@/lib/action-error";
import { sendWithdrawalEmails } from "@/lib/email/withdrawal-emails";
import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, getClientIp, withdrawalLimiter } from "@/lib/rate-limit";
import { actionClient } from "@/lib/safe-action";
import { withdrawalSchema } from "./schema";

/**
 * Online withdrawal statement (UPK art. 30 ust. 3, Dyr. 2011/83 art. 11a).
 * The e-mail must match the order: the acknowledgement goes to that address,
 * and nobody can file a withdrawal for someone else's order.
 */
export const submitWithdrawal = actionClient
  .schema(withdrawalSchema)
  .action(async ({ parsedInput: { name, email, orderNumber, items } }) => {
    await assertNotRateLimited(withdrawalLimiter, await getClientIp());

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: { equals: orderNumber, mode: "insensitive" },
        customerEmail: { equals: email, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (!order)
      throw new ActionError(
        "Nie znaleźliśmy zamówienia o tym numerze dla podanego adresu e-mail. Sprawdź dane albo wyślij oświadczenie na kontakt@wellbotany.pl.",
      );

    const withdrawal = await prisma.withdrawal.create({
      data: { orderId: order.id, name, email, items },
      select: { id: true, createdAt: true },
    });

    after(() =>
      sendWithdrawalEmails(withdrawal.id).catch((e) =>
        console.error("[withdrawal] e-mail failed", withdrawal.id, e),
      ),
    );

    return { createdAt: withdrawal.createdAt.toISOString() };
  });
