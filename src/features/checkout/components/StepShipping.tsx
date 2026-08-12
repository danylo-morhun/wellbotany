"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { SHIPPING_COSTS, SHIPPING_LABELS } from "../lib/shipping";
import type { CheckoutFormData } from "./CheckoutForm";
import { InPostGeowidget } from "./InPostGeowidget";

type Props = {
  data: CheckoutFormData;
  onChange: (updates: Partial<CheckoutFormData>) => void;
  onBack: () => void;
  onNext: () => void;
};

const SHIPPING_OPTIONS = (Object.keys(SHIPPING_COSTS) as Array<keyof typeof SHIPPING_COSTS>).map(
  (key) => ({ value: key, label: SHIPPING_LABELS[key], cost: SHIPPING_COSTS[key] }),
);

function validateNip(nip: string): boolean {
  const digits = nip.replace(/\D/g, "");
  if (digits.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0);
  return sum % 11 === parseInt(digits[9], 10);
}

export function StepShipping({ data, onChange, onBack, onNext }: Props) {
  const [nipError, setNipError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (data.wantsFaktura && !validateNip(data.billNip)) {
      setNipError("Nieprawidłowy NIP");
      return;
    }
    setNipError(null);
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-semibold">Metoda dostawy</h2>

      <div className="space-y-3">
        {SHIPPING_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
              data.shippingMethod === opt.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="shippingMethod"
                value={opt.value}
                checked={data.shippingMethod === opt.value}
                onChange={() => onChange({ shippingMethod: opt.value })}
                className="accent-primary"
              />
              <span className="text-sm font-medium">{opt.label}</span>
            </div>
            <span className="text-sm font-semibold">{formatPrice(opt.cost)}</span>
          </label>
        ))}
      </div>

      {data.shippingMethod === "INPOST_PACZKOMAT" && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          {data.inpostMachineId ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Wybrany paczkomat</p>
                <p className="text-sm text-muted-foreground">
                  {data.inpostMachineName || data.inpostMachineId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ inpostMachineId: "", inpostMachineName: "" })}
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                Zmień
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm font-medium">Identyfikator paczkomatu</p>
              <div className="mb-3">
                <InPostGeowidget
                  onSelect={(id, name) =>
                    onChange({ inpostMachineId: id, inpostMachineName: name })
                  }
                />
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Lub podaj ID paczkomatu ręcznie (np. WAW123M).
              </p>
              <input
                type="text"
                required
                placeholder="np. WAW123M"
                value={data.inpostMachineId}
                onChange={(e) => onChange({ inpostMachineId: e.target.value.toUpperCase() })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </>
          )}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={data.wantsFaktura}
            onChange={(e) => onChange({ wantsFaktura: e.target.checked })}
            className="accent-primary"
          />
          <span className="text-sm font-medium">Chcę fakturę VAT</span>
        </label>
      </div>

      {data.shippingMethod === "ORLEN_PACZKA" && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          {data.inpostMachineId ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Wybrany punkt Orlen Paczka</p>
                <p className="text-sm text-muted-foreground">
                  {data.inpostMachineName || data.inpostMachineId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ inpostMachineId: "", inpostMachineName: "" })}
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                Zmień
              </button>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm font-medium">Identyfikator punktu Orlen Paczka</p>
              <button
                type="button"
                disabled
                title="Mapa punktów będzie dostępna po integracji z Orlen Paczka"
                className="mb-3 text-sm font-medium text-muted-foreground underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline"
              >
                Wybierz na mapie (wkrótce)
              </button>
              <p className="mb-3 text-xs text-muted-foreground">
                Podaj ID punktu odbioru ręcznie (znajdziesz je na stronie orlenpaczka.pl).
              </p>
              <input
                type="text"
                required
                placeholder="np. WA12345"
                value={data.inpostMachineId}
                onChange={(e) =>
                  onChange({
                    inpostMachineId: e.target.value.toUpperCase(),
                    inpostMachineName: e.target.value.toUpperCase(),
                  })
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </>
          )}
        </div>
      )}

      {data.wantsFaktura && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold">Dane do faktury</h3>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="billCompany">
              Nazwa firmy
            </label>
            <input
              id="billCompany"
              type="text"
              required
              value={data.billCompany}
              onChange={(e) => onChange({ billCompany: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="billNip">
              NIP (10 cyfr)
            </label>
            <input
              id="billNip"
              type="text"
              required
              maxLength={10}
              value={data.billNip}
              onChange={(e) => {
                onChange({ billNip: e.target.value.replace(/\D/g, "") });
                setNipError(null);
              }}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {nipError && <p className="mt-1 text-xs text-destructive">{nipError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="billStreet">
              Ulica i numer
            </label>
            <input
              id="billStreet"
              type="text"
              required
              value={data.billStreet}
              onChange={(e) => onChange({ billStreet: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="billPostalCode">
                Kod pocztowy
              </label>
              <input
                id="billPostalCode"
                type="text"
                required
                placeholder="00-000"
                pattern="\d{2}-\d{3}"
                value={data.billPostalCode}
                onChange={(e) => onChange({ billPostalCode: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="billCity">
                Miasto
              </label>
              <input
                id="billCity"
                type="text"
                required
                value={data.billCity}
                onChange={(e) => onChange({ billCity: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-full border border-border px-4 py-3 text-sm font-medium hover:bg-muted/50"
        >
          Wstecz
        </button>
        <button
          type="submit"
          className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        >
          Dalej: Płatność
        </button>
      </div>
    </form>
  );
}
