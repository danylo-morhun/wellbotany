"use client";

import { Check, Minus, Plus, ShoppingCart, Truck } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useVariantSelection } from "@/features/catalog/components/VariantSelection";
import { useRefreshStorefront } from "@/features/session/components/StorefrontSessionProvider";
import { trackItems } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { addToCart } from "../actions";

export type Variant = {
  id: string;
  optionLabel: string | null;
  optionValue: string | null;
  pricePln: number;
  comparePricePln: number | null;
  stock: number;
  isDefault: boolean;
  /** Cena jednostkowa, e.g. "0,83 zł / szt." — null when not required or unknown */
  unitPrice?: string | null;
  /** "Najniższa cena z 30 dni przed obniżką: …" — set only while discounted */
  omnibusNote?: string | null;
  /** Reduction vs the 30-day low (lib/omnibus) — null hides the promotion */
  discountPercent?: number | null;
  /** Struck-through price: the 30-day low the percent is measured from (lib/omnibus) */
  referencePricePln?: number | null;
};

type Props = {
  variants: Variant[];
  /** Shop-wide pause: shown as unavailable, button off */
  ordersPaused?: boolean;
  /** Names the product in the confirmation toast */
  productName?: string;
};

/** "Magnez ATA (60 kaps.)", the name alone, or just the variant when the name is unknown. */
function addedLabel(name?: string, variant?: string | null): string | undefined {
  // No-break spaces keep "(60 kaps.)" on one line in the narrow toast
  if (name && variant) return `${name} (${variant.replace(/ /g, "\u00a0")})`;
  return name ?? variant ?? undefined;
}

export function AddToCartSection({ variants, ordersPaused = false, productName }: Props) {
  const refresh = useRefreshStorefront();
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0];
  const [localId, setLocalId] = useState(defaultVariant?.id ?? "");
  // On the PDP the choice is shared with the gallery (and the URL)
  const shared = useVariantSelection();
  const selectedId = shared?.selectedId ?? localId;
  const setSelectedId = shared?.select ?? setLocalId;
  const [quantity, setQuantity] = useState(1);
  const [succeeded, setSucceeded] = useState(false);

  const { execute, isExecuting } = useAction(addToCart, {
    onSuccess: ({ data, input }) => {
      if (data?.item) trackItems("add_to_cart", [{ ...data.item, quantity: input.quantity }]);
      void refresh();
      setSucceeded(true);
      setTimeout(() => setSucceeded(false), 1500);
      toast.success("Dodano do koszyka", {
        description: addedLabel(productName, selected?.optionValue),
        duration: 4000,
        action: {
          label: "Otwórz koszyk →",
          onClick: () => window.dispatchEvent(new Event("cart:open")),
        },
      });
    },
    onError: ({ error }) => {
      toast.error("Błąd", { description: error.serverError ?? "Nie udało się dodać do koszyka" });
    },
  });

  const selected = variants.find((v) => v.id === selectedId) ?? defaultVariant;

  useEffect(() => {
    if (selected && quantity > selected.stock) {
      setQuantity(Math.max(1, selected.stock));
    }
  }, [selected, quantity]);
  if (!selected) return null;

  // Paused reads as out of stock — matches the OutOfStock in the page's JSON-LD
  const available = selected.stock > 0 && !ordersPaused;
  const hasOptions = variants.some((v) => v.optionValue);
  const isMultiVariant = variants.length > 1;
  const comparePrice = selected.referencePricePln ?? null;
  const discountPct = selected.discountPercent ?? null;
  const hasDiscount = comparePrice != null && discountPct != null;

  return (
    <div className="space-y-4">
      {isMultiVariant && hasOptions && (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            {selected.optionLabel ?? "Wariant"}
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                disabled={v.stock <= 0}
                aria-pressed={v.id === selectedId}
                className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                  v.id === selectedId
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-input hover:border-primary hover:bg-muted"
                }`}
              >
                {v.id === selectedId && <Check className="size-3.5" aria-hidden />}
                {v.optionValue}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-bold text-foreground">{formatPrice(selected.pricePln)}</span>
        {hasDiscount && (
          <>
            <span className="text-lg text-muted-foreground line-through">
              {formatPrice(comparePrice)}
            </span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-accent-foreground">
              -{discountPct}%
            </span>
          </>
        )}
      </div>
      {selected.unitPrice && (
        <p className="-mt-3 text-sm text-muted-foreground">{selected.unitPrice}</p>
      )}
      {hasDiscount && selected.omnibusNote && (
        <p className="-mt-3 text-sm text-muted-foreground">{selected.omnibusNote}</p>
      )}

      <div className="space-y-1">
        <p className={`text-sm ${available ? "text-success" : "text-muted-foreground"}`}>
          {ordersPaused
            ? "Chwilowo niedostępny"
            : selected.stock > 0
              ? selected.stock <= 5
                ? `Ostatnie ${selected.stock} szt.`
                : "Dostępny"
              : "Niedostępny"}
        </p>
        {available && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="size-3.5 shrink-0" aria-hidden />
            Wysyłka w 24–48 h · paczkomat, punkt odbioru lub kurier
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Ilość:</span>
        <div className="flex items-center rounded-md border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Zmniejsz ilość"
            className="flex size-9 items-center justify-center transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.97] disabled:opacity-40 motion-reduce:active:scale-100"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(selected.stock, q + 1))}
            disabled={quantity >= selected.stock}
            aria-label="Zwiększ ilość"
            className="flex size-9 items-center justify-center transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.97] disabled:opacity-40 motion-reduce:active:scale-100"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={isExecuting || !available}
        onClick={() => execute({ variantId: selected.id, quantity })}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {succeeded && !isExecuting ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <ShoppingCart className="size-4" aria-hidden />
        )}
        <span
          key={isExecuting ? "loading" : succeeded ? "success" : "idle"}
          className="animate-[btn-text-in_200ms_ease-out_both] motion-reduce:animate-none"
        >
          {ordersPaused
            ? "Zamówienia wstrzymane"
            : isExecuting
              ? "Dodawanie…"
              : succeeded
                ? "Dodano"
                : "Dodaj do koszyka"}
        </span>
      </button>
    </div>
  );
}
