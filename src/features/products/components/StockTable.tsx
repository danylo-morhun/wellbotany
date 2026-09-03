"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { bulkUpdateStock } from "../actions";

interface VariantRow {
  id: string;
  sku: string;
  stock: number;
  productName: string;
  optionValue: string | null;
}

interface Props {
  variants: VariantRow[];
}

export function StockTable({ variants }: Props) {
  const [stocks, setStocks] = useState<Record<string, number>>(
    Object.fromEntries(variants.map((v) => [v.id, v.stock])),
  );
  const { execute, isPending } = useAction(bulkUpdateStock, {
    onSuccess: () => toast.success("Zapisano stany magazynowe"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu stanów"),
  });

  function handleSave() {
    const updates = Object.entries(stocks).map(([variantId, stock]) => ({ variantId, stock }));
    execute({ updates });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Magazyn</h1>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
        >
          {isPending ? "Zapisywanie…" : "Zapisz zmiany"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Produkt</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Wariant</th>
              <th className="px-4 py-3 font-medium w-32">Stan</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                <td className="px-4 py-2">{v.productName}</td>
                <td className="px-4 py-2 text-muted-foreground">{v.sku}</td>
                <td className="px-4 py-2 text-muted-foreground">{v.optionValue ?? "—"}</td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={stocks[v.id] ?? 0}
                    onChange={(e) =>
                      setStocks((prev) => ({
                        ...prev,
                        [v.id]: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="w-24 rounded-lg border border-border px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
            {variants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Brak wariantów
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
