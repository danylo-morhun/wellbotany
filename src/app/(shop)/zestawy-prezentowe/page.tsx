import { ArrowRight, Sparkles } from "lucide-react";
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
        href="/zestawy-prezentowe/stworz"
        className="mb-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-primary p-6 text-primary-foreground shadow-card sm:flex-row sm:items-center sm:p-8"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
            <Sparkles className="size-6" />
          </div>
          <div>
            <p className="text-xl font-extrabold tracking-tight">Złóż własny zestaw</p>
            <p className="mt-1 text-sm text-primary-foreground/85">
              Wybierz produkty samodzielnie i stwórz spersonalizowany prezent
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2 rounded-full bg-primary-foreground px-5 py-3 text-sm font-semibold text-primary">
          Stwórz zestaw
          <ArrowRight className="size-4" />
        </span>
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
