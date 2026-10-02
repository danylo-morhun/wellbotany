import { unstable_cache } from "next/cache";
import type { GiftSetListItem } from "@/features/gift-sets/components/GiftSetCard";
import { DEFAULT_GIFT_BUILDER_POLICY } from "@/features/gift-sets/lib/pricing";
import { prisma } from "@/lib/prisma";

export const GIFT_SETS_TAG = "gift-sets";

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
          _count: { select: { items: true } },
        },
      }),
      prisma.giftBuilderSettings.findUnique({ where: { id: 1 }, select: { isActive: true } }),
    ]);
    return {
      giftSets: sets.map(({ _count, ...gs }) => ({ ...gs, itemCount: _count.items })),
      builderActive: (settings ?? DEFAULT_GIFT_BUILDER_POLICY).isActive,
    };
  },
  ["home-gift-sets"],
  { tags: [GIFT_SETS_TAG] },
);
