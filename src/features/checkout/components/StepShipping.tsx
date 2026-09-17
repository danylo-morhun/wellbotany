"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { PICKUP_HOLD_DAYS, PICKUP_LOCATION_KEYS, PICKUP_LOCATIONS } from "@/lib/pickup-locations";
import {
  PICKUP_POINT_METHODS,
  requiresAddress,
  SHIPPING_COSTS,
  SHIPPING_LABELS,
  SHIPPING_METHODS_BY_PRICE,
  shippingCostFor,
} from "../lib/shipping";
import type { CheckoutFormData } from "./CheckoutForm";
import { PointMapPicker } from "./PointMapPicker";

type Props = {
  data: CheckoutFormData;
  subtotal: number;
  freeShippingThresholdPln: number | null;
  onChange: (updates: Partial<CheckoutFormData>) => void;
  onBack: () => void;
  onNext: () => void;
};

const SHIPPING_OPTIONS = SHIPPING_METHODS_BY_PRICE.map((key) => ({
  value: key,
  label: SHIPPING_LABELS[key],
}));

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function formatPostalCode(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 5);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
}

function validateNip(nip: string): boolean {
  const digits = nip.replace(/\D/g, "");
  if (digits.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * parseInt(digits[i], 10), 0);
  return sum % 11 === parseInt(digits[9], 10);
}

export function StepShipping({
  data,
  subtotal,
  freeShippingThresholdPln,
  onChange,
  onBack,
  onNext,
}: Props) {
  const [nipError, setNipError] = useState<string | null>(null);
  const pointMethod = PICKUP_POINT_METHODS[data.shippingMethod];

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
        {SHIPPING_OPTIONS.map((opt) => {
          const cost = shippingCostFor(opt.value, subtotal, freeShippingThresholdPln);
          const regularCost = SHIPPING_COSTS[opt.value];
          return (
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
                  onChange={() =>
                    onChange({
                      shippingMethod: opt.value,
                      // A point code belongs to one carrier — don't carry it across methods
                      ...(opt.value !== data.shippingMethod && {
                        inpostMachineId: "",
                        inpostMachineName: "",
                      }),
                      // Pay-at-pickup only exists for in-store pickup
                      ...(opt.value !== "PICKUP" &&
                        data.paymentMethod === "CASH_ON_DELIVERY" && {
                          paymentMethod: "BANK_TRANSFER",
                        }),
                    })
                  }
                  className="accent-primary"
                />
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <span className="text-sm font-semibold">
                {cost < regularCost && (
                  <span className="mr-2 font-normal text-muted-foreground line-through">
                    {formatPrice(regularCost)}
                  </span>
                )}
                {formatPrice(cost)}
              </span>
            </label>
          );
        })}
      </div>

      {data.shippingMethod === "PICKUP" && (
        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-medium">Punkt odbioru</legend>
          {PICKUP_LOCATION_KEYS.map((key) => {
            const location = PICKUP_LOCATIONS[key];
            return (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  data.pickupLocation === key
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="pickupLocation"
                  value={key}
                  required
                  checked={data.pickupLocation === key}
                  onChange={() => onChange({ pickupLocation: key })}
                  className="mt-1 accent-primary"
                />
                <span className="text-sm">
                  <span className="block font-medium">{location.address}</span>
                  <span className="block text-muted-foreground">{location.name}</span>
                  <span className="block text-muted-foreground">{location.hours.join(", ")}</span>
                </span>
              </label>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Damy znać e-mailem, gdy zamówienie będzie gotowe do odbioru. Czeka na Ciebie{" "}
            {PICKUP_HOLD_DAYS} dni.
          </p>
        </fieldset>
      )}

      {requiresAddress(data.shippingMethod) && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Adres dostawy</h3>
          <div>
            <label htmlFor="co-street" className="mb-1 block text-sm font-medium">
              Ulica i numer *
            </label>
            <input
              id="co-street"
              type="text"
              required
              minLength={3}
              autoComplete="address-line1"
              value={data.street}
              onChange={(e) => onChange({ street: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="co-apartment" className="mb-1 block text-sm font-medium">
              Numer lokalu
            </label>
            <input
              id="co-apartment"
              type="text"
              autoComplete="address-line2"
              placeholder="Opcjonalnie"
              value={data.apartment}
              onChange={(e) => onChange({ apartment: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="co-postalCode" className="mb-1 block text-sm font-medium">
                Kod pocztowy *
              </label>
              <input
                id="co-postalCode"
                type="text"
                inputMode="numeric"
                required
                pattern="\d{2}-\d{3}"
                title="Format: 00-000"
                placeholder="00-000"
                maxLength={6}
                autoComplete="postal-code"
                value={data.postalCode}
                onChange={(e) => onChange({ postalCode: formatPostalCode(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="co-city" className="mb-1 block text-sm font-medium">
                Miasto *
              </label>
              <input
                id="co-city"
                type="text"
                required
                minLength={2}
                autoComplete="address-level2"
                value={data.city}
                onChange={(e) => onChange({ city: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {pointMethod && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          {/* A name is only set when the point came from the map; manual entry stores just the code */}
          {data.inpostMachineName ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Wybrany {pointMethod.pointName}</p>
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
              <p className="mb-3 text-sm font-medium">Wybierz {pointMethod.pointName}</p>
              <div className="mb-3">
                <PointMapPicker
                  key={pointMethod.service}
                  service={pointMethod.service}
                  onSelect={(code, name) =>
                    onChange({
                      inpostMachineId: code,
                      // Carrier names usually already contain the code — don't repeat it
                      inpostMachineName: name.includes(code) ? name : `${name} (${code})`,
                    })
                  }
                />
              </div>
              <label htmlFor="co-pointCode" className="mb-1 block text-xs text-muted-foreground">
                Lub wpisz kod punktu ręcznie
              </label>
              <input
                id="co-pointCode"
                type="text"
                required
                placeholder={pointMethod.placeholder}
                value={data.inpostMachineId}
                onChange={(e) =>
                  onChange({
                    inpostMachineId: e.target.value.toUpperCase().trim(),
                    inpostMachineName: "",
                  })
                }
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
