"use client";

import { Minus, PackageX, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bulkUpdateStock } from "../actions";
import { useUnsavedChanges } from "./editor/useUnsavedChanges";

interface VariantRow {
  id: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  productId: string;
  productName: string;
  productActive: boolean;
  brand: string | null;
  image: string | null;
  optionValue: string | null;
}

type Filter = "all" | "low" | "out" | "changed";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export function StockTable({ variants }: { variants: VariantRow[] }) {
  const router = useRouter();
  const [baseline, setBaseline] = useState<Record<string, number>>(() =>
    Object.fromEntries(variants.map((v) => [v.id, v.stock])),
  );
  const [stocks, setStocks] = useState(baseline);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const changed = useMemo(
    () => Object.keys(stocks).filter((id) => stocks[id] !== baseline[id]),
    [stocks, baseline],
  );
  useUnsavedChanges(changed.length > 0);

  const { execute, isPending } = useAction(bulkUpdateStock, {
    onSuccess: () => {
      toast.success(`Zapisano stany: ${changed.length}`);
      setBaseline(stocks);
      router.refresh();
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu stanów"),
  });

  const isLow = (v: VariantRow) => stocks[v.id] > 0 && stocks[v.id] <= v.lowStockThreshold;
  const counts = {
    all: variants.length,
    low: variants.filter(isLow).length,
    out: variants.filter((v) => stocks[v.id] === 0).length,
    changed: changed.length,
  };

  const visible = useMemo(() => {
    const q = norm(query.trim());
    return variants.filter((v) => {
      const stock = stocks[v.id];
      if (filter === "low" && !(stock > 0 && stock <= v.lowStockThreshold)) return false;
      if (filter === "out" && stocks[v.id] !== 0) return false;
      if (filter === "changed" && stocks[v.id] === baseline[v.id]) return false;
      return !q || norm(`${v.productName} ${v.sku} ${v.brand ?? ""}`).includes(q);
    });
  }, [variants, query, filter, stocks, baseline]);

  function setStock(id: string, value: number) {
    setStocks((prev) => ({ ...prev, [id]: Math.max(0, Math.round(value) || 0) }));
  }

  function save() {
    execute({ updates: changed.map((variantId) => ({ variantId, stock: stocks[variantId] })) });
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "Wszystkie" },
    { key: "low", label: "Niski stan" },
    { key: "out", label: "Brak" },
    { key: "changed", label: "Zmienione" },
  ];

  return (
    <div>
      {changed.length > 0 && (
        <div className="sticky top-16 z-20 mb-4 flex items-center gap-3 rounded-xl bg-foreground py-2 pr-2 pl-4 text-sm text-background shadow-float">
          <span className="flex-1 font-medium">Niezapisane zmiany stanów: {changed.length}</span>
          <button
            type="button"
            onClick={() => setStocks(baseline)}
            className="h-8 rounded-lg px-3 font-medium text-background/80 hover:bg-background/10 hover:text-background"
          >
            Odrzuć
          </button>
          <Button onClick={save} disabled={isPending} className="h-8 px-3">
            {isPending ? "Zapisywanie…" : "Zapisz"}
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Produkt, SKU, marka…"
            aria-label="Szukaj w magazynie"
            className="h-9 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={filter === t.key}
              onClick={() => setFilter(t.key)}
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-card"
            >
              {t.label}
              <span className="text-xs tabular-nums opacity-70">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="h-10 pl-4 font-medium">Produkt</th>
              <th className="h-10 px-3 font-medium">SKU</th>
              <th className="h-10 px-3 font-medium">Status</th>
              <th className="h-10 w-48 pr-4 text-right font-medium">Stan</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 300).map((v) => {
              const value = stocks[v.id];
              const isChanged = value !== baseline[v.id];
              return (
                <tr
                  key={v.id}
                  className={cn(
                    "border-b border-border/70 last:border-0",
                    isChanged ? "bg-secondary/60" : "hover:bg-muted/40",
                  )}
                >
                  <td className="py-2 pl-4">
                    <div className="flex items-center gap-3">
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                        {v.image && (
                          <Image src={v.image} alt="" fill sizes="36px" className="object-cover" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/produkty/${v.productId}`}
                          className="line-clamp-1 font-medium hover:text-primary"
                        >
                          {v.productName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {[v.brand, v.optionValue].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{v.sku}</td>
                  <td className="px-3 py-2">
                    {value === 0 ? (
                      <Badge tone="danger" dot>
                        Brak
                      </Badge>
                    ) : value <= v.lowStockThreshold ? (
                      <Badge tone="warning" dot>
                        Niski
                      </Badge>
                    ) : (
                      <Badge tone="success" dot>
                        OK
                      </Badge>
                    )}
                    {!v.productActive && (
                      <span className="ml-1.5 text-xs text-muted-foreground">nieaktywny</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="ml-auto flex w-fit items-center rounded-lg border border-border bg-background">
                      <button
                        type="button"
                        aria-label={`Zmniejsz stan ${v.sku}`}
                        onClick={() => setStock(v.id, value - 1)}
                        disabled={value === 0}
                        className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={value}
                        aria-label={`Stan ${v.sku}`}
                        onChange={(e) => setStock(v.id, Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="h-8 w-16 border-x border-border bg-transparent text-center text-sm font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        aria-label={`Zwiększ stan ${v.sku}`}
                        onClick={() => setStock(v.id, value + 1)}
                        className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <PackageX className="mb-2 size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Brak wariantów w tym widoku</p>
          </div>
        )}
        {visible.length > 300 && (
          <p className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
            Pokazano 300 z {visible.length} — zawęź wyszukiwanie.
          </p>
        )}
      </div>
    </div>
  );
}
