"use client";

import { Store } from "lucide-react";
import Image from "next/image";
import { Fragment } from "react";
import { formatPrice } from "@/lib/format";
import { PICKUP_HOLD_DAYS, PICKUP_LOCATION_KEYS, PICKUP_LOCATIONS } from "@/lib/pickup-locations";
import {
  CARRIERS,
  carrierLogo,
  isPointService,
  requiresAddress,
  type ShippingRate,
  shippingCostFor,
} from "../lib/shipping";
import type { CheckoutFormData } from "./CheckoutForm";
import { PointPicker } from "./PointPicker";

type Props = {
  data: CheckoutFormData;
  subtotal: number;
  freeShippingThresholdPln: number | null;
  shippingRates: ShippingRate[];
  onChange: (updates: Partial<CheckoutFormData>) => void;
  onBack: () => void;
  onNext: () => void;
};

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function formatPostalCode(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 5);
  return digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
}

export function StepShipping({
  data,
  subtotal,
  freeShippingThresholdPln,
  shippingRates,
  onChange,
  onBack,
  onNext,
}: Props) {
  const pointService = isPointService(data.shippingMethod) ? data.shippingMethod : null;
  const pointMethod = pointService && CARRIERS[pointService].point;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  // Point picker / address / store choice opens right under the chosen method —
  // with many carriers it would otherwise sit below a long list
  const methodDetails = (
    <>
      {data.shippingMethod === "PICKUP" && (
        <fieldset className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <legend className="sr-only">Punkt odbioru</legend>
          <p className="text-sm font-medium">Punkt odbioru</p>
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
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
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

      {pointService && pointMethod && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          {/* A name is only set when the point came from the map; manual entry stores just the code */}
          {data.inpostMachineName ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Wybrany {pointMethod.name}</p>
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
              <p className="mb-3 text-sm font-medium">Wybierz {pointMethod.name}</p>
              <div className="mb-3">
                <PointPicker
                  key={pointService}
                  service={pointService}
                  pointName={pointMethod.name}
                  onSelect={(code, name) =>
                    onChange({ inpostMachineId: code, inpostMachineName: name })
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
    </>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-lg font-semibold">Metoda dostawy</h2>

      <div className="space-y-3">
        {shippingRates.map((rate) => {
          const opt = { value: rate.method, label: CARRIERS[rate.method].label };
          const cost = shippingCostFor(rate.pricePln, subtotal, freeShippingThresholdPln);
          const regularCost = rate.pricePln;
          const logo = carrierLogo(rate.method);
          return (
            <Fragment key={opt.value}>
              <label
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
                  {/* White plate keeps brand colours readable in dark mode */}
                  <span className="flex h-7 w-12 shrink-0 items-center justify-center rounded bg-white p-0.5">
                    {logo ? (
                      <Image
                        src={logo}
                        alt=""
                        width={48}
                        height={28}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Store className="size-4 text-primary" aria-hidden />
                    )}
                  </span>
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
              {data.shippingMethod === opt.value && methodDetails}
            </Fragment>
          );
        })}
      </div>

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
