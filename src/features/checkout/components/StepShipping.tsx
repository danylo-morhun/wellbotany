"use client";

import { Store } from "lucide-react";
import Image from "next/image";
import { Fragment, type RefObject, useState } from "react";
import { FieldError, inputClass } from "@/components/ui/field";
import { fieldA11y } from "@/lib/field-a11y";
import { formatPrice } from "@/lib/format";
import { PICKUP_HOLD_DAYS, PICKUP_LOCATION_KEYS, PICKUP_LOCATIONS } from "@/lib/pickup-locations";
import { formatPostalCode } from "@/lib/postal-code";
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

/** Field ids in visual order, so the first invalid one can take focus. */
const SHIPPING_FIELDS = [
  "co-pickupLocation",
  "co-street",
  "co-postalCode",
  "co-city",
  "co-pointCode",
] as const;
type ShippingErrors = Partial<Record<(typeof SHIPPING_FIELDS)[number], string>>;

/** Mirrors the server's per-method requirements (checkoutSchema) with the same format rules. */
function validateShipping(data: CheckoutFormData, pointName: string | null): ShippingErrors {
  const errors: ShippingErrors = {};
  if (data.shippingMethod === "PICKUP" && !data.pickupLocation) {
    errors["co-pickupLocation"] = "Wybierz punkt odbioru";
  }
  if (requiresAddress(data.shippingMethod)) {
    const street = data.street.trim();
    if (!street) errors["co-street"] = "Podaj ulicę i numer domu";
    else if (street.length < 3) errors["co-street"] = "Wpisz pełną ulicę i numer, min. 3 znaki";
    if (!data.postalCode.trim()) errors["co-postalCode"] = "Podaj kod pocztowy";
    else if (!/^\d{2}-\d{3}$/.test(data.postalCode))
      errors["co-postalCode"] = "Wpisz kod w formacie 00-000";
    const city = data.city.trim();
    if (!city) errors["co-city"] = "Podaj miasto";
    else if (city.length < 2) errors["co-city"] = "Nazwa miasta musi mieć co najmniej 2 znaki";
  }
  if (pointName && !data.inpostMachineId.trim()) {
    errors["co-pointCode"] = `Wybierz ${pointName} na mapie lub wpisz jego kod`;
  }
  return errors;
}

type Props = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  data: CheckoutFormData;
  /** Subtotal after discounts — what the free-delivery threshold is checked against */
  productsPln: number;
  freeShippingThresholdPln: number | null;
  shippingRates: ShippingRate[];
  onChange: (updates: Partial<CheckoutFormData>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepShipping({
  headingRef,
  data,
  productsPln,
  freeShippingThresholdPln,
  shippingRates,
  onChange,
  onBack,
  onNext,
}: Props) {
  const pointService = isPointService(data.shippingMethod) ? data.shippingMethod : null;
  const pointMethod = pointService && CARRIERS[pointService].point;

  // Errors appear on the first "Dalej", then follow the data as it's corrected
  const [checked, setChecked] = useState(false);
  const errors: ShippingErrors = checked ? validateShipping(data, pointMethod?.name ?? null) : {};
  const pickup = fieldA11y("co-pickupLocation", errors["co-pickupLocation"]);
  const street = fieldA11y("co-street", errors["co-street"]);
  const postal = fieldA11y("co-postalCode", errors["co-postalCode"]);
  const city = fieldA11y("co-city", errors["co-city"]);
  const pointCode = fieldA11y("co-pointCode", errors["co-pointCode"]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateShipping(data, pointMethod?.name ?? null);
    const first = SHIPPING_FIELDS.find((f) => found[f]);
    if (first) {
      setChecked(true);
      const el =
        first === "co-pickupLocation"
          ? document.querySelector<HTMLInputElement>('input[name="pickupLocation"]')
          : document.getElementById(first);
      el?.focus();
      return;
    }
    onNext();
  }

  // Point picker / address / store choice opens right under the chosen method —
  // with many carriers it would otherwise sit below a long list
  const methodDetails = (
    <>
      {data.shippingMethod === "PICKUP" && (
        <fieldset
          aria-describedby={pickup.inputProps["aria-describedby"]}
          className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
        >
          <legend className="sr-only">Punkt odbioru</legend>
          <p className="text-sm font-medium">Punkt odbioru *</p>
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
                  aria-invalid={pickup.inputProps["aria-invalid"]}
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
          <FieldError id={pickup.errorId} message={errors["co-pickupLocation"]} />
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
              {...street.inputProps}
              type="text"
              aria-required
              autoComplete="address-line1"
              value={data.street}
              onChange={(e) => onChange({ street: e.target.value })}
              className={inputClass}
            />
            <FieldError id={street.errorId} message={errors["co-street"]} />
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
                {...postal.inputProps}
                type="text"
                inputMode="numeric"
                aria-required
                placeholder="00-000"
                maxLength={6}
                autoComplete="postal-code"
                value={data.postalCode}
                onChange={(e) => onChange({ postalCode: formatPostalCode(e.target.value) })}
                className={inputClass}
              />
              <FieldError id={postal.errorId} message={errors["co-postalCode"]} />
            </div>
            <div>
              <label htmlFor="co-city" className="mb-1 block text-sm font-medium">
                Miasto *
              </label>
              <input
                {...city.inputProps}
                type="text"
                aria-required
                autoComplete="address-level2"
                value={data.city}
                onChange={(e) => onChange({ city: e.target.value })}
                className={inputClass}
              />
              <FieldError id={city.errorId} message={errors["co-city"]} />
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
                {...pointCode.inputProps}
                type="text"
                aria-required
                autoComplete="off"
                placeholder={pointMethod.placeholder}
                value={data.inpostMachineId}
                onChange={(e) =>
                  onChange({
                    inpostMachineId: e.target.value.toUpperCase().trim(),
                    inpostMachineName: "",
                  })
                }
                className={inputClass}
              />
              <FieldError id={pointCode.errorId} message={errors["co-pointCode"]} />
            </>
          )}
        </div>
      )}
    </>
  );

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
        Metoda dostawy
      </h2>

      <fieldset className="space-y-3">
        <legend className="sr-only">Metoda dostawy</legend>
        {shippingRates.map((rate) => {
          const opt = { value: rate.method, label: CARRIERS[rate.method].label };
          const cost = shippingCostFor(rate.pricePln, productsPln, freeShippingThresholdPln);
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
                    onChange={() => {
                      // A new method has its own fields; don't greet them with errors
                      if (opt.value !== data.shippingMethod) setChecked(false);
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
                      });
                    }}
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
      </fieldset>

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
