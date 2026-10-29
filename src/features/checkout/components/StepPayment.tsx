"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { type RefObject, useRef, useState } from "react";
import { FieldError, FormError, inputClass } from "@/components/ui/field";
import { groupCartItems } from "@/features/cart/lib/grouping";
import { effectiveUnitPricePln } from "@/features/cart/lib/pricing";
import type { CartItem } from "@/features/cart/lib/session";
import type { CartDiscount } from "@/features/promotions/lib/tiered";
import { fieldA11y } from "@/lib/field-a11y";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isOfflinePayment } from "../lib/payment";
import { type OrderTotals, shippingLabel } from "../lib/shipping";
import type { CheckoutFormData, CouponResult } from "./CheckoutForm";

type Props = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  data: CheckoutFormData;
  onChange: (updates: Partial<CheckoutFormData>) => void;
  onBack: () => void;
  onSubmit: () => void;
  items: CartItem[];
  subtotal: number;
  discount: CartDiscount;
  promoName?: string;
  totals: OrderTotals;
  couponResult: CouponResult | null;
  verifyingCoupon: boolean;
  onVerifyCoupon: (code: string) => void;
  /** The typed code changed, so the last verification no longer applies */
  onCouponEdit: () => void;
  onlinePaymentsEnabled: boolean;
  pending: boolean;
  error: string | null;
};

const PAYMENT_OPTIONS = [
  { value: "BANK_TRANSFER" as const, label: "Przelew tradycyjny" },
  { value: "CASH_ON_DELIVERY" as const, label: "Płatność przy odbiorze w sklepie" },
  { value: "BLIK" as const, label: "BLIK" },
  { value: "PRZELEWY24" as const, label: "Przelew online (Przelewy24)" },
  { value: "APPLE_PAY" as const, label: "Apple Pay" },
  { value: "GOOGLE_PAY" as const, label: "Google Pay" },
];

export function StepPayment({
  headingRef,
  data,
  onChange,
  onBack,
  onSubmit,
  items,
  subtotal,
  discount: { discountPln: discount, source: discountSource, note: discountNote },
  promoName,
  totals,
  couponResult,
  verifyingCoupon: verifying,
  onVerifyCoupon,
  onCouponEdit,
  onlinePaymentsEnabled,
  pending,
  error,
}: Props) {
  const [termsError, setTermsError] = useState<string | null>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const terms = fieldA11y("acceptedTerms", termsError);
  const handleVerifyCoupon = () => onVerifyCoupon(data.couponCode);

  // The button stays enabled so a missed checkbox gets an explanation, not a dead button
  const handleSubmit = () => {
    if (!data.acceptedTerms) {
      setTermsError("Zaakceptuj regulamin, aby złożyć zamówienie.");
      termsRef.current?.focus();
      return;
    }
    onSubmit();
  };

  const { shippingPln: shippingCost, totalPln: total } = totals;

  return (
    <div className="space-y-6">
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
        Płatność i podsumowanie
      </h2>

      {/* Order summary */}
      <div className="rounded-lg border border-border p-4">
        <h3 className="mb-3 text-sm font-semibold">Produkty</h3>
        <ul className="divide-y divide-border">
          {groupCartItems(items).map((row) =>
            row.kind === "single" ? (
              <li key={row.item.id} className="flex justify-between py-2 text-sm">
                <span className="text-muted-foreground">
                  {row.item.variant.product.namePl}
                  {row.item.variant.optionValue ? ` (${row.item.variant.optionValue})` : ""} ×{" "}
                  {row.item.quantity}
                </span>
                <span>{formatPrice(effectiveUnitPricePln(row.item) * row.item.quantity)}</span>
              </li>
            ) : (
              <li key={row.groupId} className="py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span>{formatPrice(row.totalPln)}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {row.items.map((i) => `${i.quantity}× ${i.variant.product.namePl}`).join(", ")}
                </span>
                {row.packagingLabel && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opakowanie: {row.packagingLabel}
                  </p>
                )}
                {row.giftMessage && (
                  <p className="mt-0.5 text-xs italic text-muted-foreground">„{row.giftMessage}”</p>
                )}
              </li>
            ),
          )}
        </ul>

        <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Produkty</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Dostawa ({shippingLabel(data.shippingMethod)})</span>
            <span>{formatPrice(shippingCost)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-success">
              <span>
                {discountSource === "promo" ? `Rabat ${promoName}` : `Rabat (${data.couponCode})`}
              </span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}
          {discountNote && <p className="text-xs text-muted-foreground">{discountNote}</p>}
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Łącznie</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Coupon */}
      <div>
        <label htmlFor="couponCode" className="mb-1 block text-sm font-medium">
          Kod rabatowy (opcjonalnie)
        </label>
        <div className="flex gap-2">
          <input
            id="couponCode"
            type="text"
            value={data.couponCode}
            onChange={(e) => {
              onChange({ couponCode: e.target.value.toUpperCase() });
              onCouponEdit();
            }}
            aria-describedby="couponCode-result"
            className={cn(inputClass, "flex-1 uppercase")}
          />
          <button
            type="button"
            onClick={handleVerifyCoupon}
            disabled={verifying || !data.couponCode.trim()}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {verifying ? "…" : "Zastosuj"}
          </button>
        </div>
        {/* Mounted before the result arrives, so screen readers announce it */}
        <p
          id="couponCode-result"
          role="status"
          className={`mt-2 text-sm empty:mt-0 ${couponResult?.valid ? "text-success" : "text-destructive"}`}
        >
          {couponResult &&
            (couponResult.valid
              ? `✓ Rabat: -${formatPrice(couponResult.discountPln)}${couponResult.message ? ` · ${couponResult.message}` : ""}`
              : couponResult.message)}
        </p>
      </div>

      {/* Payment method */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Metoda płatności</legend>
        <div className="space-y-2">
          {PAYMENT_OPTIONS.filter(
            (opt) =>
              (opt.value !== "CASH_ON_DELIVERY" || data.shippingMethod === "PICKUP") &&
              (onlinePaymentsEnabled || isOfflinePayment(opt.value)),
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                data.paymentMethod === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={opt.value}
                checked={data.paymentMethod === opt.value}
                onChange={() => onChange({ paymentMethod: opt.value })}
                className="accent-primary"
              />
              <span className="text-sm font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
        {data.paymentMethod === "BANK_TRANSFER" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Dane do przelewu pokażemy po złożeniu zamówienia i wyślemy e-mailem. Zamówienie
            zrealizujemy po zaksięgowaniu wpłaty.
          </p>
        )}
        {data.paymentMethod === "CASH_ON_DELIVERY" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Zapłacisz przy odbiorze zamówienia w sklepie.
          </p>
        )}
      </fieldset>

      <FormError message={error} className="px-4 py-3" />

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input
            ref={termsRef}
            type="checkbox"
            checked={data.acceptedTerms}
            onChange={(e) => {
              onChange({ acceptedTerms: e.target.checked });
              if (e.target.checked) setTermsError(null);
            }}
            {...terms.inputProps}
            className="size-5 shrink-0 accent-primary"
          />
          <span>
            Akceptuję {/* New tab: leaving this page would lose the checkout form */}
            <a
              href="/regulamin"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              regulamin sklepu
              <span className="sr-only"> (otwiera się w nowej karcie)</span>
            </a>
          </span>
        </label>
        <FieldError id={terms.errorId} message={termsError} />
      </div>

      {/* Phones: the long legally-worded button gets the full width, Wstecz goes under it */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="flex-1 rounded-full border border-border px-4 py-3 text-sm font-medium transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/50 active:scale-[0.97] disabled:opacity-50 motion-reduce:active:scale-100"
        >
          Wstecz
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {/* Wording required by art. 17 ust. 3 ustawy o prawach konsumenta */}
          {pending
            ? "Składam zamówienie…"
            : `Zamawiam z obowiązkiem zapłaty — ${formatPrice(total)}`}
        </button>
      </div>
      <div className="space-y-1.5 text-center text-xs text-muted-foreground">
        {!isOfflinePayment(data.paymentMethod) && (
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            Płatność zabezpieczona przez Przelewy24
          </p>
        )}
        {/* Regulamin §7 / ustawa o prawach konsumenta art. 27; §8 exceptions live on /zwroty */}
        <p className="text-pretty">
          Masz 14 dni na odstąpienie od umowy bez podania przyczyny.{" "}
          <Link
            href="/zwroty"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Zasady zwrotów
            <span className="sr-only"> (otwiera się w nowej karcie)</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
