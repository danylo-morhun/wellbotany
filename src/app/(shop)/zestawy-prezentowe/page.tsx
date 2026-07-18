import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GiftSetCard } from "@/features/gift-sets/components/GiftSetCard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Zestawy prezentowe — Twoje Zdrowie",
};

export default async function GiftSetsPage() {
  const giftSets = await prisma.giftSet.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    select: {
      slug: true,
      namePl: true,
      imageUrl: true,
      pricePln: true,
      comparePricePln: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Zestawy prezentowe</h1>
        <p className="mt-2 text-muted-foreground">
          Gotowe zestawy dobrane przez nas albo złóż własny, dokładnie taki, jaki chcesz podarować.
        </p>
      </div>

      <Link
        href="/naborys/stworz"
        className="mb-8 flex items-center gap-4 rounded-2xl bg-primary/5 p-5 transition-colors hover:bg-primary/10"
      >
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Złóż własny zestaw</p>
          <p className="text-sm text-muted-foreground">
            Wybierz produkty samodzielnie i stwórz spersonalizowany prezent
          </p>
        </div>
      </Link>

      {giftSets.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {giftSets.map((gs) => (
            <GiftSetCard
              key={gs.slug}
              giftSet={{
                slug: gs.slug,
                namePl: gs.namePl,
                imageUrl: gs.imageUrl,
                pricePln: gs.pricePln,
                comparePricePln: gs.comparePricePln,
                itemCount: gs._count.items,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Brak gotowych zestawów — złóż własny powyżej.
        </p>
      )}
    </div>
  );
}
