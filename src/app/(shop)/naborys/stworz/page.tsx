import type { Metadata } from "next";
import { GiftBuilder } from "@/features/gift-sets/components/GiftBuilder";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Złóż własny zestaw prezentowy — Twoje Zdrowie",
};

export default async function GiftBuilderPage() {
  const settings = await prisma.giftBuilderSettings.findUnique({ where: { id: 1 } });

  if (!settings || !settings.isActive) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Kreator zestawów jest chwilowo niedostępny</h1>
        <p className="mt-2 text-muted-foreground">Zajrzyj do gotowych zestawów prezentowych.</p>
      </div>
    );
  }

  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, product: { isGiftEligible: true, status: "ACTIVE" } },
    select: {
      id: true,
      pricePln: true,
      stock: true,
      optionValue: true,
      product: {
        select: {
          namePl: true,
          images: {
            where: { isMain: true },
            select: { url: true },
            take: 1,
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
    orderBy: { product: { namePl: "asc" } },
  });

  const pool = variants.map((v) => ({
    variantId: v.id,
    productName: v.product.namePl,
    optionValue: v.optionValue,
    pricePln: v.pricePln,
    stock: v.stock,
    imageUrl: v.product.images[0]?.url ?? null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{settings.namePl}</h1>
        <p className="mt-2 text-muted-foreground">
          Wybierz od {settings.minItems} do {settings.maxItems} produktów i złóż zestaw dokładnie
          dla siebie.
        </p>
      </div>

      <GiftBuilder settings={settings} pool={pool} />
    </div>
  );
}
