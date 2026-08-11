"use client";

import { Minus, Plus, ShoppingCart, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
};

type Props = {
  variants: Variant[];
};

export function AddToCartSection({ variants }: Props) {
  const router = useRouter();
  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0];
  const [selectedId, setSelectedId] = useState(defaultVariant?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [succeeded, setSucceeded] = useState(false);

  const { execute, isExecuting } = useAction(addToCart, {
    onSuccess: () => {
      router.refresh();
      setSucceeded(true);
      setTimeout(() => setSucceeded(false), 1500);
      toast.success("Dodano do koszyka", {
        description: selected?.optionValue ?? undefined,
        duration: 4000,
        action: {
          label: "Otwórz koszyk →",
          onClick: () => window.dispatchEvent(new Event("cart:open")),
        },
      });
    },
    onError: () => {
      toast.error("Błąd", { description: "Nie udało się dodać do koszyka" });
    },
  });

  const selected = variants.find((v) => v.id === selectedId) ?? defaultVariant;

  useEffect(() => {
    if (selected && quantity > selected.stock) {
      setQuantity(Math.max(1, selected.stock));
    }
  }, [selected, quantity]);
  if (!selected) return null;

  const hasOptions = variants.some((v) => v.optionValue);
  const isMultiVariant = variants.length > 1;
  const comparePrice = selected.comparePricePln;
  const hasDiscount = comparePrice && comparePrice > selected.pricePln;
  const discountPct = hasDiscount
    ? Math.round(((comparePrice - selected.pricePln) / comparePrice) * 100)
    : 0;

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
                className={`rounded-md border px-3 py-1.5 text-sm transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:opacity-40 ${
                  v.id === selectedId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary hover:bg-muted"
                }`}
              >
                {v.optionValue}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-foreground">{formatPrice(selected.pricePln)}</span>
        {hasDiscount && (
          <>
            <span className="text-lg text-muted-foreground line-through">
              {formatPrice(comparePrice)}
            </span>
            <span className="rounded bg-destructive/10 px-2 py-0.5 text-sm font-medium text-destructive">
              -{discountPct}%
            </span>
          </>
        )}
      </div>

      <div className="space-y-1">
        <p className={`text-sm ${selected.stock > 0 ? "text-success" : "text-muted-foreground"}`}>
          {selected.stock > 0
            ? selected.stock <= 5
              ? `Ostatnie ${selected.stock} szt.`
              : "Dostępny"
            : "Niedostępny"}
        </p>
        {selected.stock > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="size-3.5 shrink-0" aria-hidden />
            Wysyłka w 24h · InPost, DHL, DPD
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
        disabled={isExecuting || selected.stock <= 0}
        onClick={() => execute({ variantId: selected.id, quantity })}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <ShoppingCart className="size-4" />
        <span
          key={isExecuting ? "loading" : succeeded ? "success" : "idle"}
          className="animate-[btn-text-in_200ms_ease-out_both]"
        >
          {isExecuting ? "Dodawanie…" : succeeded ? "✓ Dodano" : "Dodaj do koszyka"}
        </span>
      </button>
    </div>
  );
}
