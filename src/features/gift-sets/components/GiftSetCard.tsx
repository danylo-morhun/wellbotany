import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

export type GiftSetListItem = {
  slug: string;
  namePl: string;
  imageUrl: string | null;
  pricePln: number;
  comparePricePln: number | null;
  itemCount: number;
};

export function GiftSetCard({ giftSet }: { giftSet: GiftSetListItem }) {
  const hasDiscount = giftSet.comparePricePln != null && giftSet.comparePricePln > giftSet.pricePln;

  return (
    <Link
      href={`/naborys/${giftSet.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        {giftSet.imageUrl ? (
          <Image
            src={giftSet.imageUrl}
            alt={giftSet.namePl}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-5 transition-transform duration-300 ease-out group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <span className="text-sm">Brak zdjęcia</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 pt-2">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {giftSet.namePl}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{giftSet.itemCount} produktów</p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">
            {formatPrice(giftSet.pricePln)}
          </span>
          {hasDiscount && giftSet.comparePricePln != null && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(giftSet.comparePricePln)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
