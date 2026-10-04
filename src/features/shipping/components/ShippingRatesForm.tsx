"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { table } from "@/app/admin/components/ui";
import { Button } from "@/components/ui/button";
import { CARRIERS, type ShippingMethodKey } from "@/features/checkout/lib/shipping";
import { Switch, TextInput } from "@/features/products/components/editor/fields";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { loadEpakaPrices, saveShippingRates } from "../actions";

export type RateRow = { method: ShippingMethodKey; pricePln: number | null; enabled: boolean };

const DELIVERY_LABEL = { point: "Punkt", door: "Kurier", store: "Sklep" } as const;

function toInput(grosz: number | null): string {
  return grosz === null ? "" : (grosz / 100).toFixed(2).replace(".", ",");
}

function toGrosz(value: string): number | null {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return value.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function ShippingRatesForm({ rows, epakaReady }: { rows: RateRow[]; epakaReady: boolean }) {
  const [state, setState] = useState(() => rows.map((r) => ({ ...r, price: toInput(r.pricePln) })));
  const [epakaPrices, setEpakaPrices] = useState<Partial<Record<ShippingMethodKey, number>>>();

  const save = useAction(saveShippingRates, {
    onSuccess: () => toast.success("Ceny dostawy zapisane"),
    onError: ({ error }) => toast.error("Błąd", { description: error.serverError }),
  });
  const load = useAction(loadEpakaPrices, {
    onSuccess: ({ data }) => setEpakaPrices(data?.prices),
    onError: ({ error }) =>
      toast.error("Nie udało się pobrać cen epaka", { description: error.serverError }),
  });

  function update(method: ShippingMethodKey, patch: Partial<(typeof state)[number]>) {
    setState((prev) => prev.map((r) => (r.method === method ? { ...r, ...patch } : r)));
  }

  function applyEpakaPrices() {
    if (!epakaPrices) return;
    setState((prev) =>
      prev.map((r) => {
        const cost = epakaPrices[r.method];
        return cost === undefined ? r : { ...r, price: toInput(cost) };
      }),
    );
    toast.info("Ceny ustawione jak w epaka — sprawdź i zapisz");
  }

  function handleSave() {
    const invalid = state.find((r) => r.enabled && toGrosz(r.price) === null);
    if (invalid) {
      toast.error(`Podaj cenę: ${CARRIERS[invalid.method].label}`);
      return;
    }
    save.execute({
      rates: state
        .filter((r) => toGrosz(r.price) !== null)
        .map((r) => ({ method: r.method, pricePln: toGrosz(r.price) ?? 0, enabled: r.enabled })),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!epakaReady || load.isPending}
          onClick={() => load.execute({})}
        >
          {load.isPending ? "Pobieranie…" : "Pobierz ceny z epaka"}
        </Button>
        <Button type="button" variant="outline" disabled={!epakaPrices} onClick={applyEpakaPrices}>
          Ustaw wszystkie ceny jak w epaka
        </Button>
        {!epakaReady && (
          <p className="text-xs text-muted-foreground">
            Ceny epaka będą dostępne po dodaniu EPAKA_CLIENT_ID i EPAKA_CLIENT_SECRET.
          </p>
        )}
      </div>

      <div className={table.wrap}>
        <table className={table.table}>
          <thead className={table.thead}>
            <tr>
              <th className={table.th}>Metoda</th>
              <th className={table.th}>Rodzaj</th>
              <th className={table.th}>W sklepie</th>
              <th className={table.th}>Cena dla klienta</th>
              <th className={table.th}>Koszt epaka</th>
            </tr>
          </thead>
          <tbody>
            {state.map((r) => {
              const carrier = CARRIERS[r.method];
              const cost = epakaPrices?.[r.method];
              const price = toGrosz(r.price);
              const diff = cost !== undefined && price !== null ? price - cost : null;
              return (
                <tr key={r.method} className={table.tr}>
                  <td className={cn(table.td, "font-medium")}>{carrier.label}</td>
                  <td className={cn(table.td, "text-muted-foreground")}>
                    {DELIVERY_LABEL[carrier.delivery]}
                  </td>
                  <td className={table.td}>
                    <Switch
                      label=""
                      checked={r.enabled}
                      onChange={(enabled) => update(r.method, { enabled })}
                    />
                  </td>
                  <td className={table.td}>
                    <div className="relative w-28">
                      <TextInput
                        aria-label={`Cena: ${carrier.label}`}
                        inputMode="decimal"
                        value={r.price}
                        placeholder="—"
                        onChange={(e) => update(r.method, { price: e.target.value })}
                        className="pr-8 tabular-nums"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                        zł
                      </span>
                    </div>
                  </td>
                  <td className={cn(table.td, "tabular-nums")}>
                    {cost === undefined ? (
                      <span className="text-muted-foreground">
                        {epakaPrices && carrier.epakaCourierId !== null ? "niedostępny" : "—"}
                      </span>
                    ) : (
                      <>
                        {formatPrice(cost)}
                        {diff !== null && diff !== 0 && (
                          <span
                            className={cn(
                              "ml-2 text-xs",
                              diff < 0 ? "text-destructive" : "text-success",
                            )}
                          >
                            {diff > 0 ? "+" : "−"}
                            {formatPrice(Math.abs(diff))}
                          </span>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Koszt epaka to cena brutto z Twojego cennika dla paczki 30×20×10 cm, 1 kg. Po zmianie
        najniższej ceny zaktualizuj też stawkę w Google Merchant Center.
      </p>

      <Button type="button" size="lg" disabled={save.isPending} onClick={handleSave}>
        {save.isPending ? "Zapisywanie…" : "Zapisz ceny dostawy"}
      </Button>
    </div>
  );
}
