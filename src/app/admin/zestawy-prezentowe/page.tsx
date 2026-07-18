import Link from "next/link";
import { GiftSetsAdmin } from "@/features/gift-sets/components/GiftSetsAdmin";
import { prisma } from "@/lib/prisma";

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
    <div className="space-y-4">
      <div className="flex gap-4">
        <Link
          href="/admin/zestawy-prezentowe/ustawienia"
          className="text-sm font-medium text-primary hover:underline"
        >
          Ustawienia kreatora własnego zestawu →
        </Link>
        <Link
          href="/admin/zestawy-prezentowe/opakowania"
          className="text-sm font-medium text-primary hover:underline"
        >
          Opakowania →
        </Link>
      </div>
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
    </div>
  );
}
