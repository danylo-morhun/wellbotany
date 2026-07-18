import Link from "next/link";
import { GiftSetsAdmin } from "@/features/gift-sets/components/GiftSetsAdmin";
import { prisma } from "@/lib/prisma";

export default async function AdminGiftSetsPage() {
  const [giftSets, variants] = await Promise.all([
    prisma.giftSet.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: { select: { id: true, variantId: true, quantity: true } } },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { status: "ACTIVE" } },
      select: {
        id: true,
        sku: true,
        pricePln: true,
        optionValue: true,
        product: { select: { namePl: true } },
      },
      orderBy: { product: { namePl: "asc" } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/admin/naborys/ustawienia"
        className="text-sm font-medium text-primary hover:underline"
      >
        Ustawienia kreatora własnego zestawu →
      </Link>
      <GiftSetsAdmin
        giftSets={giftSets}
        variants={variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          pricePln: v.pricePln,
          optionValue: v.optionValue,
          productName: v.product.namePl,
        }))}
      />
    </div>
  );
}
