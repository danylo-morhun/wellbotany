"use client";

import { ArrowRight, Search, SearchX } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import type { FormEvent, KeyboardEvent } from "react";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { formatPrice } from "@/lib/format";
import { searchProductSuggestions } from "../search-actions";

type Suggestion = {
  slug: string;
  namePl: string;
  brandName: string | null;
  image: { url: string; altPl: string | null } | null;
  variant: { pricePln: number; comparePricePln: number | null; stock: number } | null;
};

type Props = {
  className?: string;
  inputClassName?: string;
};

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 220;
const SKELETON_WIDTHS = [70, 60, 50];

const DEFAULT_INPUT_CLASS =
  "w-full rounded-full border border-border bg-muted/60 py-2.5 pl-11 pr-4 text-sm text-foreground transition-shadow duration-200 placeholder:text-muted-foreground focus:border-transparent focus:bg-card focus:shadow-card focus:outline-none focus:ring-2 focus:ring-ring/50 motion-reduce:transition-none";

export function HeaderSearch({ className, inputClassName }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, setIsPending] = useState(false);

  const { execute } = useAction(searchProductSuggestions, {
    onSuccess: ({ data }) => {
      setResults(data ?? []);
      setIsPending(false);
    },
    onError: () => setIsPending(false),
  });

  const search = useDebouncedCallback((value: string) => {
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsPending(false);
      return;
    }
    execute({ query: value.trim() });
  }, SEARCH_DEBOUNCE_MS);

  function goToProduct(slug: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
    router.push(`/produkt/${slug}`);
  }

  function goToAllResults() {
    setOpen(false);
    const trimmed = query.trim();
    router.push(trimmed ? `/katalog?szukaj=${encodeURIComponent(trimmed)}` : "/katalog");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    goToAllResults();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      goToProduct(results[activeIndex].slug);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;
  const showEmpty = !isPending && results.length === 0;

  return (
    <form action="/katalog" onSubmit={handleSubmit} className={`relative ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="szukaj"
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          setOpen(true);
          setActiveIndex(-1);
          setIsPending(value.trim().length >= MIN_QUERY_LENGTH);
          search(value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Szukaj witamin, suplementów…"
        aria-label="Szukaj produktów"
        autoComplete="off"
        className={inputClassName ?? DEFAULT_INPUT_CLASS}
      />

      {showDropdown && (
        <div className="animate-in fade-in-0 zoom-in-95 absolute z-50 mt-2 w-full origin-top overflow-hidden rounded-2xl border border-border bg-card shadow-float duration-150">
          <div className="max-h-80 divide-y divide-border/60 overflow-y-auto">
            {isPending &&
              SKELETON_WIDTHS.map((width) => (
                <div key={width} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span
                      className="block h-3 animate-pulse rounded bg-muted"
                      style={{ width: `${width}%` }}
                    />
                    <span className="block h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                  </span>
                  <span className="h-3 w-12 shrink-0 animate-pulse rounded bg-muted" />
                </div>
              ))}

            {!isPending &&
              results.map((r, i) => (
                <button
                  key={r.slug}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => goToProduct(r.slug)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIndex ? "bg-muted" : "hover:bg-muted"
                  }`}
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-card">
                    {r.image && (
                      <Image
                        src={r.image.url}
                        alt={r.image.altPl ?? r.namePl}
                        fill
                        sizes="40px"
                        className="object-contain p-1"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {r.namePl}
                    </span>
                    {r.brandName && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.brandName}
                      </span>
                    )}
                  </span>
                  {r.variant && (
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {formatPrice(r.variant.pricePln)}
                    </span>
                  )}
                </button>
              ))}

            {showEmpty && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <SearchX className="size-6 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">Brak wyników dla „{query.trim()}”</p>
              </div>
            )}
          </div>

          {!isPending && results.length > 0 && (
            <button
              type="submit"
              onMouseDown={(e) => e.preventDefault()}
              className="flex w-full items-center justify-between gap-2 bg-primary/5 px-4 py-3 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Zobacz wszystkie wyniki dla „{query.trim()}”
              <ArrowRight className="size-4 shrink-0" />
            </button>
          )}
        </div>
      )}
    </form>
  );
}
