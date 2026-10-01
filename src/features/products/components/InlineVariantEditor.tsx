"use client";

import { useAction } from "next-safe-action/hooks";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { quickUpdateVariant } from "../actions";
import { inputClass } from "./editor/fields";

type Props = {
  variantId: string;
  pricePln: number;
  stock: number;
};

function formatPrice(grosz: number) {
  return (grosz / 100).toFixed(2);
}

export function InlineVariantEditor({ variantId, pricePln, stock }: Props) {
  const [priceInput, setPriceInput] = useState(formatPrice(pricePln));
  const [stockInput, setStockInput] = useState(stock);
  const [committed, setCommitted] = useState({ pricePln, stock });
  const pendingValues = useRef(committed);

  const { execute, isPending } = useAction(quickUpdateVariant, {
    onSuccess: () => {
      setCommitted(pendingValues.current);
      toast.success("Zapisano");
    },
    onError: ({ error }) => {
      toast.error(error?.serverError ?? "Błąd zapisu");
      setPriceInput(formatPrice(committed.pricePln));
      setStockInput(committed.stock);
    },
  });

  function commit() {
    const parsedPrice = Math.round(Number(priceInput.replace(",", ".")) * 100);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setPriceInput(formatPrice(committed.pricePln));
      return;
    }
    if (parsedPrice === committed.pricePln && stockInput === committed.stock) return;
    pendingValues.current = { pricePln: parsedPrice, stock: stockInput };
    execute({ variantId, pricePln: parsedPrice, stock: stockInput });
  }

  function commitOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    // Blur runs commit(); calling it here too would double-submit
    if (e.key === "Enter") e.currentTarget.blur();
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        disabled={isPending}
        value={priceInput}
        onChange={(e) => setPriceInput(e.target.value)}
        onBlur={commit}
        onKeyDown={commitOnEnter}
        className={cn(inputClass, "h-8 w-20 px-2 tabular-nums")}
        aria-label="Cena (PLN)"
      />
      <input
        type="number"
        min={0}
        disabled={isPending}
        value={stockInput}
        onChange={(e) => setStockInput(Math.max(0, Number(e.target.value)))}
        onBlur={commit}
        onKeyDown={commitOnEnter}
        className={cn(inputClass, "h-8 w-16 px-2 tabular-nums")}
        aria-label="Stan magazynowy"
      />
    </div>
  );
}
