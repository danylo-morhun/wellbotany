"use client";

import { Gift, MessageSquareText, Package, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { removeGiftSetFromCart } from "../actions";
import { effectiveUnitPricePln } from "../lib/pricing";
import type { CartItem } from "../lib/session";

type Props = {
  groupId: string;
  label: string;
  items: CartItem[];
  totalPln: number;
  packagingLabel: string | null;
  giftMessage: string | null;
};

export function GiftSetCartRow({
  groupId,
  label,
  items,
  totalPln,
  packagingLabel,
  giftMessage,
}: Props) {
  const router = useRouter();
  const { execute: doRemove, isExecuting: removing } = useAction(removeGiftSetFromCart, {
    onSuccess: () => {
      router.refresh();
      toast.success("Zestaw usunięty z koszyka");
    },
    onError: () => {
      toast.error("Błąd", { description: "Nie udało się usunąć zestawu" });
    },
  });

  return (
    <div className={`px-6 py-5 transition-opacity duration-200 ${removing ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gift className="size-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">{label}</p>
        </div>
        <p className="shrink-0 text-sm font-bold text-foreground">{formatPrice(totalPln)}</p>
      </div>

      <ul className="mt-3 space-y-1.5 border-l-2 border-border pl-4">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-muted-foreground">
              {item.quantity}× {item.variant.product.namePl}
              {item.variant.optionValue ? ` — ${item.variant.optionValue}` : ""}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {formatPrice(effectiveUnitPricePln(item) * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {packagingLabel && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="size-3.5" />
          Opakowanie: {packagingLabel}
        </p>
      )}
      {giftMessage && (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MessageSquareText className="mt-0.5 size-3.5 shrink-0" />
          <span className="italic">„{giftMessage}”</span>
        </p>
      )}

      <button
        type="button"
        disabled={removing}
        onClick={() => doRemove({ giftSetGroupId: groupId })}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
        Usuń zestaw
      </button>
    </div>
  );
}
