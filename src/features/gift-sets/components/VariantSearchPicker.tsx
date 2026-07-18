"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { formatPrice } from "@/lib/format";
import { searchVariantsForGiftSet } from "../actions";

type SearchResult = {
  id: string;
  sku: string;
  pricePln: number;
  optionValue: string | null;
  productName: string;
};

type Props = {
  excludeIds: string[];
  onPick: (variant: SearchResult) => void;
};

export function VariantSearchPicker({ excludeIds, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  const { execute, isExecuting } = useAction(searchVariantsForGiftSet, {
    onSuccess: ({ data }) => setResults(data ?? []),
  });

  const handleSearch = useDebouncedCallback((value: string) => {
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    execute({ query: value.trim() });
  }, 300);

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          handleSearch(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Szukaj produktu po nazwie lub SKU…"
        className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-float">
          {isExecuting && <p className="px-3 py-2 text-xs text-muted-foreground">Szukanie…</p>}
          {!isExecuting &&
            results
              .filter((r) => !excludeIds.includes(r.id))
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(r);
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
                >
                  <span className="min-w-0 truncate">
                    {r.productName}
                    {r.optionValue ? ` — ${r.optionValue}` : ""}{" "}
                    <span className="text-muted-foreground">({r.sku})</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">{formatPrice(r.pricePln)}</span>
                </button>
              ))}
          {!isExecuting && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Brak wyników</p>
          )}
        </div>
      )}
    </div>
  );
}
