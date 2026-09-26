import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCategories, PRODUCT_LIST_SELECT } from "../actions";

// Same shape as listings, so ProductCard gets everything it needs
const productSelect = PRODUCT_LIST_SELECT;

export const getHomepageData = unstable_cache(
  async () => {
    const [categories, featured, newArrivals, promos] = await Promise.all([
      getCategories(),
      prisma.product.findMany({
        where: { status: "ACTIVE", isFeatured: true },
        take: 8,
        orderBy: { updatedAt: "desc" },
        select: productSelect,
      }),
      prisma.product.findMany({
        where: { status: "ACTIVE", isNewArrival: true },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: productSelect,
      }),
      prisma.product.findMany({
        // comparePricePln is only set when a variant is discounted
        where: {
          status: "ACTIVE",
          variants: { some: { isActive: true, comparePricePln: { not: null } } },
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
        select: productSelect,
      }),
    ]);

    const heroProduct = featured.find((p) => p.images.length > 0) ?? null;

    return { categories, featured, newArrivals, promos, heroProduct };
  },
  ["homepage"],
  { tags: ["categories", "products"] },
);
