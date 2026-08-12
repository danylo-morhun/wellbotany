import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AddCuratedGiftSetButton } from "@/features/gift-sets/components/AddCuratedGiftSetButton";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

async function getGiftSet(slug: string) {
  return prisma.giftSet.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      items: {
        include: {
          variant: {
            select: {
              id: true,
              optionValue: true,
              pricePln: true,
              stock: true,
              product: { select: { namePl: true } },
            },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const giftSet = await getGiftSet(slug);
  return { title: giftSet ? `${giftSet.namePl} — Well Botany` : "Zestaw prezentowy" };
}

export default async function GiftSetDetailPage({ params }: Props) {
  const { slug } = await params;
  const giftSet = await getGiftSet(slug);
  if (!giftSet) notFound();

  const isAvailable = giftSet.items.every((i) => i.variant.stock >= i.quantity);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-card shadow-card">
          {giftSet.imageUrl ? (
            <Image
              src={giftSet.imageUrl}
              alt={giftSet.namePl}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-8"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Brak zdjęcia
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">{giftSet.namePl}</h1>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-foreground">
              {formatPrice(giftSet.pricePln)}
            </span>
            {giftSet.comparePricePln != null && giftSet.comparePricePln > giftSet.pricePln && (
              <span className="text-base text-muted-foreground line-through">
                {formatPrice(giftSet.comparePricePln)}
              </span>
            )}
          </div>

          {giftSet.descriptionPl && (
            <p className="mt-4 text-sm text-muted-foreground">{giftSet.descriptionPl}</p>
          )}

          <div className="mt-6 rounded-xl border border-border p-4">
            <p className="mb-2 text-sm font-semibold">W zestawie:</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {giftSet.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}× {item.variant.product.namePl}
                    {item.variant.optionValue ? ` — ${item.variant.optionValue}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <AddCuratedGiftSetButton giftSetId={giftSet.id} disabled={!isAvailable} />
            {!isAvailable && (
              <p className="mt-2 text-center text-sm text-destructive">
                Jeden z produktów w zestawie jest chwilowo niedostępny
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
