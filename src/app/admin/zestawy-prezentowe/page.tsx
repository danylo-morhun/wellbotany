import type { Metadata } from "next";
import { GiftSetsAdmin } from "@/features/gift-sets/components/GiftSetsAdmin";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Zestawy prezentowe" };

export default async function AdminGiftSetsPage() {
  const giftSets = await prisma.giftSet.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        select: {
          id: true,
          variantId: true,
          quantity: true,
          variant: {
            select: { pricePln: true, optionValue: true, product: { select: { namePl: true } } },
          },
        },
      },
    },
  });

  return (
    <GiftSetsAdmin
      giftSets={giftSets.map((gs) => ({
        ...gs,
        items: gs.items.map((i) => ({
          id: i.id,
          variantId: i.variantId,
          quantity: i.quantity,
          productName: i.variant.product.namePl,
          optionValue: i.variant.optionValue,
          pricePln: i.variant.pricePln,
        })),
      }))}
    />
  );
}
