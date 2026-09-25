"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, getClientIp, reviewLimiter } from "@/lib/rate-limit";
import { actionClient, adminActionClient } from "@/lib/safe-action";
import { getReviewableOrder, REVIEWS_TAG } from "./lib/queries";
import { requestOrderReview } from "./lib/request";
import { moderateReviewSchema, requestReviewSchema, submitReviewsSchema } from "./schema";

/** Public: the review link token is the credential (sent only to the buyer's email). */
export const submitReviews = actionClient
  .schema(submitReviewsSchema)
  .action(async ({ parsedInput: input }) => {
    await assertNotRateLimited(reviewLimiter, await getClientIp());
    const order = await getReviewableOrder(input.token);
    if (!order) throw new ActionError("Link do opinii wygasł lub jest nieprawidłowy");

    const allowed = new Set(order.products.map((p) => p.id));
    const locked = new Set(
      order.reviews.filter((r) => r.status !== "PENDING").map((r) => r.productId),
    );
    const toSave = input.reviews.filter(
      (r) => allowed.has(r.productId) && !locked.has(r.productId),
    );
    if (toSave.length === 0) throw new ActionError("Te produkty zostały już ocenione");

    await prisma.$transaction(
      toSave.map((r) =>
        prisma.review.upsert({
          where: { orderId_productId: { orderId: order.id, productId: r.productId } },
          create: {
            orderId: order.id,
            productId: r.productId,
            authorName: input.authorName,
            rating: r.rating,
            content: r.content,
          },
          update: { authorName: input.authorName, rating: r.rating, content: r.content },
        }),
      ),
    );
    revalidatePath("/admin/opinie");
    return { saved: toSave.length };
  });

export const moderateReview = adminActionClient
  .schema(moderateReviewSchema)
  .action(async ({ parsedInput: { id, status } }) => {
    const review = await prisma.review.update({
      where: { id },
      data: { status },
      select: { product: { select: { slug: true } } },
    });
    revalidateTag(REVIEWS_TAG, "max");
    revalidatePath(`/produkt/${review.product.slug}`);
    revalidatePath("/admin/opinie");
    return { success: true };
  });

export const requestReviewForOrder = adminActionClient
  .schema(requestReviewSchema)
  .action(async ({ parsedInput: { orderId } }) => {
    const sent = await requestOrderReview(orderId, { force: true });
    if (!sent)
      throw new ActionError(
        "Prośbę o opinię można wysłać dla zamówień wysłanych lub dostarczonych",
      );
    revalidatePath(`/admin/zamowienia/${orderId}`);
    return { success: true };
  });
