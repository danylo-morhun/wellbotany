"use client";

import { useAction } from "next-safe-action/hooks";
import { useId, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { inputClass } from "@/features/products/components/editor/fields";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
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

  const listId = useId();
  const [active, setActive] = useState(0);
  const visible = results.filter((r) => !excludeIds.includes(r.id));
  const expanded = open && query.trim().length >= 2;

  function pick(r: SearchResult) {
    onPick(r);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && expanded && visible[active]) {
      e.preventDefault();
      pick(visible[active]);
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: focus-out tracking only, not an interaction
    <div
      className="relative"
      // Close only when focus leaves the whole picker, so Tab can reach the results
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <input
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && visible[active] ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
          handleSearch(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Szukaj produktu po nazwie lub SKU…"
        aria-label="Dodaj produkt do zestawu"
        className={cn(inputClass, "h-9")}
      />

      {expanded && (
        <div
          id={listId}
          role="listbox"
          aria-label="Wyniki wyszukiwania"
          aria-busy={isExecuting}
          className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-float"
        >
          {isExecuting && <p className="px-3 py-2 text-xs text-muted-foreground">Szukanie…</p>}
          {!isExecuting &&
            visible.map((r, i) => (
              <button
                key={r.id}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                data-active={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => pick(r)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted focus-visible:bg-muted focus-visible:outline-none data-[active=true]:bg-secondary pointer-coarse:py-3"
              >
                <span className="min-w-0 truncate">
                  {r.productName}
                  {r.optionValue ? ` — ${r.optionValue}` : ""}{" "}
                  <span className="text-muted-foreground">({r.sku})</span>
                </span>
                <span className="shrink-0 text-muted-foreground">{formatPrice(r.pricePln)}</span>
              </button>
            ))}
          {!isExecuting && visible.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Brak wyników</p>
          )}
        </div>
      )}
    </div>
  );
}
