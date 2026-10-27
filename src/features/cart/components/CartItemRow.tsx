"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { useRefreshStorefront } from "@/features/session/components/StorefrontSessionProvider";
import { formatPrice } from "@/lib/format";
import { removeFromCart, updateQuantity } from "../actions";
import { effectiveUnitPricePln } from "../lib/pricing";
import type { CartItem } from "../lib/session";

type Props = {
  item: CartItem;
  onRemove?: () => void;
};

export function CartItemRow({ item, onRemove }: Props) {
  const refresh = useRefreshStorefront();
  const { execute: doRemove, isExecuting: removing } = useAction(removeFromCart, {
    onSuccess: () => {
      void refresh();
      if (!onRemove) toast.success("Usunięto z koszyka");
    },
    onError: () => {
      toast.error("Błąd", { description: "Nie udało się usunąć produktu" });
    },
  });
  const { execute: doUpdate, isExecuting: updating } = useAction(updateQuantity, {
    onSuccess: () => void refresh(),
    onError: () => {
      toast.error("Błąd", { description: "Nie udało się zaktualizować ilości" });
    },
  });

  const pending = removing || updating;
  const image = item.variant.product.images[0];
  const name = item.variant.product.namePl;

  return (
    <div
      className={`flex gap-3 px-4 py-5 transition-opacity sm:gap-4 sm:px-6 duration-200 ${pending ? "opacity-60" : ""}`}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
        {image ? (
          <Image
            src={image.url}
            alt={image.altPl ?? item.variant.product.namePl}
            fill
            sizes="96px"
            className="object-contain"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
            Brak
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* Two lines: supplement names carry the dose/form that tells variants apart */}
            <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-foreground">
              {item.variant.product.namePl}
            </p>
            {item.variant.optionValue && (
              <p className="mt-0.5 text-xs text-muted-foreground">{item.variant.optionValue}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPrice(effectiveUnitPricePln(item))} / szt.
            </p>
          </div>
          <p className="shrink-0 text-sm font-bold text-foreground">
            {formatPrice(effectiveUnitPricePln(item) * item.quantity)}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-3">
          <fieldset
            aria-label={`Ilość: ${name}`}
            className="flex items-center overflow-hidden rounded-lg border border-border"
          >
            <button
              type="button"
              disabled={pending || item.quantity <= 1}
              onClick={() => doUpdate({ cartItemId: item.id, quantity: item.quantity - 1 })}
              className="flex size-10 items-center justify-center text-muted-foreground pointer-coarse:size-11 transition-[background-color,color] duration-[120ms] hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label={`Zmniejsz ilość: ${name}`}
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
            <span
              aria-live="polite"
              className="w-9 border-x border-border text-center text-sm font-semibold"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              disabled={pending || item.quantity >= item.variant.stock}
              onClick={() => doUpdate({ cartItemId: item.id, quantity: item.quantity + 1 })}
              className="flex size-10 items-center justify-center text-muted-foreground pointer-coarse:size-11 transition-[background-color,color] duration-[120ms] hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label={`Zwiększ ilość: ${name}`}
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </fieldset>

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (onRemove) {
                onRemove();
                doRemove({ cartItemId: item.id });
              } else {
                doRemove({ cartItemId: item.id });
              }
            }}
            className="ml-auto flex size-10 items-center pointer-coarse:size-11 justify-center rounded-lg text-muted-foreground transition-[background-color,color] duration-[120ms] hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
            aria-label={`Usuń ${name} z koszyka`}
          >
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
