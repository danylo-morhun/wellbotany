import { unstable_cache } from "next/cache";
import { MAIN_IMAGE_FIRST } from "@/features/catalog/lib/main-image";
import { prisma } from "@/lib/prisma";

export const REVIEWS_TAG = "reviews";

// Orders older than this can't be reviewed through the email link anymore
export const REVIEW_LINK_TTL_DAYS = 120;
const REVIEWABLE_STATUSES = ["SHIPPED", "DELIVERED"] as const;

/** Approved reviews + average for a product page. */
export const getProductReviews = unstable_cache(
  async (productId: string) => {
    const where = { productId, status: "APPROVED" as const };
    const [items, aggregate] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, authorName: true, rating: true, content: true, createdAt: true },
      }),
      prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
    ]);
    return {
      items,
      count: aggregate._count,
      average: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
    };
  },
  ["product-reviews"],
  { tags: [REVIEWS_TAG] },
);

/** The order behind a review link, with its distinct products; null when invalid/expired. */
export async function getReviewableOrder(token: string) {
  const order = await prisma.order.findUnique({
    where: { reviewToken: token },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      status: true,
      reviewRequestedAt: true,
      items: {
        select: {
          variant: {
            select: {
              product: {
                select: {
                  id: true,
                  slug: true,
                  namePl: true,
                  images: { select: { url: true }, orderBy: MAIN_IMAGE_FIRST, take: 1 },
                },
              },
            },
          },
        },
      },
      reviews: { select: { productId: true, rating: true, content: true, status: true } },
    },
  });
  if (!order || !(REVIEWABLE_STATUSES as readonly string[]).includes(order.status)) return null;
  const requestedAt = order.reviewRequestedAt?.getTime() ?? 0;
  if (Date.now() - requestedAt > REVIEW_LINK_TTL_DAYS * 24 * 60 * 60 * 1000) return null;

  const products = new Map<
    string,
    { id: string; slug: string; namePl: string; image: string | null }
  >();
  for (const item of order.items) {
    const p = item.variant?.product;
    if (p && !products.has(p.id))
      products.set(p.id, {
        id: p.id,
        slug: p.slug,
        namePl: p.namePl,
        image: p.images[0]?.url ?? null,
      });
  }
  return { ...order, products: [...products.values()] };
}

/** "Anna Kowalska" → "Anna K." — the public name suggested in the form. */
export function publicName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  const lastInitial = rest.at(-1)?.charAt(0);
  return lastInitial ? `${first} ${lastInitial.toUpperCase()}.` : (first ?? "");
}
