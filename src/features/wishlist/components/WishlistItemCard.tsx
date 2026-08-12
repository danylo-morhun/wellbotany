"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { addToCart } from "@/features/cart/actions";
import { formatPrice } from "@/lib/format";
import { removeFromWishlist } from "../actions";
import type { WishlistItem } from "../lib/session";

type Props = {
  item: WishlistItem;
};

export function WishlistItemCard({ item }: Props) {
  const router = useRouter();

  const { execute: doRemove, isExecuting: removing } = useAction(removeFromWishlist, {
    onSuccess: () => {
      router.refresh();
      toast("Usunięto z ulubionych");
    },
    onError: () => toast.error("Błąd", { description: "Nie udało się usunąć z ulubionych" }),
  });

  const { execute: doAddToCart, isExecuting: adding } = useAction(addToCart, {
    onSuccess: () => {
      router.refresh();
      toast.success("Dodano do koszyka");
    },
    onError: () => toast.error("Błąd", { description: "Nie udało się dodać do koszyka" }),
  });

  const image = item.product.images[0];
  const variant = item.product.variants[0];
  const inStock = variant && variant.stock > 0;
  const lowStock = inStock && variant.stock <= 5;

  return (
    <div className="flex gap-4 rounded-2xl bg-card p-4 shadow-card">
      <Link
        href={`/produkt/${item.product.slug}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-card"
      >
        {image ? (
          <Image
            src={image.url}
            alt={image.altPl ?? item.product.namePl}
            fill
            sizes="80px"
            className="object-contain"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
            Brak
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        {item.product.brand && (
          <p className="text-xs text-muted-foreground">{item.product.brand.name}</p>
        )}
        <Link
          href={`/produkt/${item.product.slug}`}
          className="line-clamp-2 text-sm font-semibold hover:text-primary"
        >
          {item.product.namePl}
        </Link>
        {variant && (
          <p className="text-base font-bold text-primary">{formatPrice(variant.pricePln)}</p>
        )}
        <div className="flex items-center gap-1 text-xs">
          <span className={`size-2 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`} />
          <span className={inStock ? "text-success" : "text-muted-foreground"}>
            {inStock ? (lowStock ? `Ostatnie ${variant.stock} szt.` : "Dostępny") : "Niedostępny"}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-2">
        <button
          type="button"
          onClick={() => doRemove({ wishlistItemId: item.id })}
          disabled={removing}
          aria-label="Usuń z ulubionych"
          className="text-muted-foreground hover:text-destructive disabled:opacity-40"
        >
          <Trash2 className="size-4" />
        </button>
        {variant && inStock && (
          <button
            type="button"
            onClick={() => doAddToCart({ variantId: variant.id, quantity: 1 })}
            disabled={adding}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
          >
            <ShoppingCart className="size-3" />
            {adding ? "…" : "Do koszyka"}
          </button>
        )}
      </div>
    </div>
  );
}
