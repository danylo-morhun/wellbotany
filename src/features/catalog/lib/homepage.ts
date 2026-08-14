import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCategories } from "../actions";

const productSelect = {
  id: true,
  slug: true,
  namePl: true,
  shortDescPl: true,
  isNewArrival: true,
  isFeatured: true,
  brand: {
    select: { name: true, slug: true, parentBrand: { select: { name: true, slug: true } } },
  },
  category: { select: { namePl: true, slug: true } },
  images: {
    where: { isMain: true },
    select: { url: true, altPl: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
  variants: {
    where: { isActive: true },
    select: { id: true, pricePln: true, comparePricePln: true, stock: true, isDefault: true },
    orderBy: { isDefault: "desc" as const },
    take: 1,
  },
  tags: {
    select: {
      tag: { select: { namePl: true, slug: true, iconUrl: true, type: true } },
    },
  },
} as const;

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
