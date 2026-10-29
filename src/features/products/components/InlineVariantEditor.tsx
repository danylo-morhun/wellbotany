"use client";

import { useAction } from "next-safe-action/hooks";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { quickUpdateVariant } from "../actions";
import { formatPlnInput, parsePlnInput } from "../lib/price-input";
import { inputClass } from "./editor/fields";

type Props = {
  variantId: string;
  pricePln: number;
  stock: number;
  /** Inline edit only makes sense when the row has exactly one variant */
  variantCount: number;
};

type Values = { pricePln: number; stock: number };

export function InlineVariantEditor({ variantId, pricePln, stock, variantCount }: Props) {
  const [priceInput, setPriceInput] = useState(formatPlnInput(pricePln));
  const [stockInput, setStockInput] = useState(stock);
  const [committed, setCommitted] = useState<Values>({ pricePln, stock });
  const pending = useRef<{ next: Values; prev: Values; undo: boolean } | null>(null);

  function show(v: Values) {
    setPriceInput(formatPlnInput(v.pricePln));
    setStockInput(v.stock);
  }

  const { execute, isPending } = useAction(quickUpdateVariant, {
    onSuccess: () => {
      const p = pending.current;
      if (!p) return;
      setCommitted(p.next);
      show(p.next);
      if (p.undo) toast.success("Przywrócono poprzednie wartości");
      else
        toast.success("Zapisano", {
          action: { label: "Cofnij", onClick: () => save(p.prev, true) },
        });
    },
    onError: ({ error }) => {
      toast.error(error?.serverError ?? "Błąd zapisu");
      show(committed);
    },
  });

  function save(next: Values, undo = false) {
    pending.current = { next, prev: committed, undo };
    execute({ variantId, ...next });
  }

  function commit() {
    const parsedPrice = parsePlnInput(priceInput);
    if (parsedPrice === null) {
      toast.error("Nieprawidłowa cena — wpisz kwotę większą od zera, np. 12,99");
      setPriceInput(formatPlnInput(committed.pricePln));
      return;
    }
    if (parsedPrice === committed.pricePln && stockInput === committed.stock) {
      setPriceInput(formatPlnInput(parsedPrice));
      return;
    }
    save({ pricePln: parsedPrice, stock: stockInput });
  }

  function commitOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    // Blur runs commit(); calling it here too would double-submit
    if (e.key === "Enter") e.currentTarget.blur();
  }

  if (variantCount > 1) {
    return (
      <div className="text-sm tabular-nums">
        <p>
          {formatPrice(pricePln)} · {stock} szt.
          <span className="sr-only"> (wariant domyślny)</span>
        </p>
        <p className="text-xs text-muted-foreground">Kilka wariantów — edytuj w karcie</p>
      </div>
    );
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
