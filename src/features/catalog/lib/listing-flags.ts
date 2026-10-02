import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Whether the "Promocje" / "Nowości" listings have anything to show — nav
 * links to an empty listing are hidden until they do. */
export const getListingFlags = unstable_cache(
  async () => {
    const [promo, newArrival] = await Promise.all([
      prisma.product.findFirst({
        where: {
          status: "ACTIVE",
          variants: { some: { isActive: true, comparePricePln: { not: null } } },
        },
        select: { id: true },
      }),
      prisma.product.findFirst({
        where: { status: "ACTIVE", isNewArrival: true },
        select: { id: true },
      }),
    ]);
    return { hasPromos: promo !== null, hasNewArrivals: newArrival !== null };
  },
  ["listing-flags"],
  { tags: ["products"] },
);
