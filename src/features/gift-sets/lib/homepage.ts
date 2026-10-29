import { unstable_cache } from "next/cache";
import type { GiftSetListItem } from "@/features/gift-sets/components/GiftSetCard";
import { DEFAULT_GIFT_BUILDER_POLICY } from "@/features/gift-sets/lib/pricing";
import { prisma } from "@/lib/prisma";

export const GIFT_SETS_TAG = "gift-sets";

/** Item count + the first items' main packshots, for the card fallback image. */
export const GIFT_SET_ITEM_IMAGES = {
  _count: { select: { items: true } },
  items: {
    take: 3,
    select: {
      variant: {
        select: {
          product: {
            select: { images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } } },
          },
        },
      },
    },
  },
} as const;

type WithItemImages = {
  _count: { items: number };
  items: { variant: { product: { images: { url: string }[] } } }[];
};

export function toGiftSetListItem<T extends WithItemImages>({ _count, items, ...gs }: T) {
  return {
    ...gs,
    itemCount: _count.items,
    itemImages: items.flatMap((i) => i.variant.product.images.map((im) => im.url)),
  };
}

// Builder tile + 3 sets = one row on desktop, 2×2 on phones
const HOME_GIFT_SETS_LIMIT = 3;

export const getHomeGiftSets = unstable_cache(
  async (): Promise<{ giftSets: GiftSetListItem[]; builderActive: boolean }> => {
    const [sets, settings] = await Promise.all([
      prisma.giftSet.findMany({
        where: { status: "ACTIVE" },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: HOME_GIFT_SETS_LIMIT,
        select: {
          slug: true,
          namePl: true,
          imageUrl: true,
          pricePln: true,
          comparePricePln: true,
          lowestPrice30dPln: true,
          ...GIFT_SET_ITEM_IMAGES,
        },
      }),
      prisma.giftBuilderSettings.findUnique({ where: { id: 1 }, select: { isActive: true } }),
    ]);
    return {
      giftSets: sets.map(toGiftSetListItem),
      builderActive: (settings ?? DEFAULT_GIFT_BUILDER_POLICY).isActive,
    };
  },
  ["home-gift-sets-v2"],
  { tags: [GIFT_SETS_TAG] },
);
