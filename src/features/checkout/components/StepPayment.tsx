"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { groupCartItems } from "@/features/cart/lib/grouping";
import { effectiveUnitPricePln } from "@/features/cart/lib/pricing";
import type { CartItem } from "@/features/cart/lib/session";
import { formatPrice } from "@/lib/format";
import { verifyCoupon } from "../actions";
import { SHIPPING_COSTS, SHIPPING_LABELS } from "../lib/shipping";
import type { CheckoutFormData } from "./CheckoutForm";

type Props = {
  data: CheckoutFormData;
  onChange: (updates: Partial<CheckoutFormData>) => void;
  onBack: () => void;
  onSubmit: () => void;
  items: CartItem[];
  subtotal: number;
  pending: boolean;
  error: string | null;
};

const PAYMENT_OPTIONS = [
  { value: "BLIK" as const, label: "BLIK" },
  { value: "PRZELEWY24" as const, label: "Przelew online (Przelewy24)" },
  { value: "APPLE_PAY" as const, label: "Apple Pay" },
  { value: "GOOGLE_PAY" as const, label: "Google Pay" },
];

export function StepPayment({
  data,
  onChange,
  onBack,
  onSubmit,
  items,
  subtotal,
  pending,
  error,
}: Props) {
  const shippingCost = SHIPPING_COSTS[data.shippingMethod as keyof typeof SHIPPING_COSTS] ?? 1999;
  const shippingLabel =
    SHIPPING_LABELS[data.shippingMethod as keyof typeof SHIPPING_LABELS] ?? data.shippingMethod;

  const [couponResult, setCouponResult] = useState<{
    valid: boolean;
    discountPln: number;
    message: string | null;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { execute: executeVerify } = useAction(verifyCoupon, {
    onSuccess: ({ data: result }) => {
      setCouponResult(result ?? null);
      setVerifying(false);
    },
    onError: () => setVerifying(false),
  });

  const handleVerifyCoupon = () => {
    if (!data.couponCode.trim()) return;
    setVerifying(true);
    executeVerify({ code: data.couponCode, subtotal });
  };

  const discount = couponResult?.valid ? couponResult.discountPln : 0;
  const total = subtotal + shippingCost - discount;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Płatność i podsumowanie</h2>

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
            <span>Dostawa ({shippingLabel})</span>
            <span>{formatPrice(shippingCost)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Rabat ({data.couponCode})</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Łącznie</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Coupon */}
      <div className="space-y-2">
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
              setCouponResult(null);
            }}
            placeholder="KOD RABATOWY"
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleVerifyCoupon}
            disabled={verifying || !data.couponCode.trim()}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {verifying ? "…" : "Zastosuj"}
          </button>
        </div>
        {couponResult && (
          <p className={`text-sm ${couponResult.valid ? "text-success" : "text-destructive"}`}>
            {couponResult.valid
              ? `✓ Rabat: -${formatPrice(couponResult.discountPln)}`
              : couponResult.message}
          </p>
        )}
      </div>

      {/* Payment method */}
      <div>
        <p className="mb-3 text-sm font-medium">Metoda płatności</p>
        <div className="space-y-2">
          {PAYMENT_OPTIONS.map((opt) => (
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
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={data.acceptedTerms}
          onChange={(e) => onChange({ acceptedTerms: e.target.checked })}
          className="mt-0.5"
        />
        <span>
          Akceptuję{" "}
          <a href="/regulamin" className="underline hover:text-foreground">
            regulamin sklepu
          </a>{" "}
          i{" "}
          <a href="/polityka-prywatnosci" className="underline hover:text-foreground">
            politykę prywatności
          </a>
        </span>
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/50 active:scale-[0.97] disabled:opacity-50 motion-reduce:active:scale-100"
        >
          Wstecz
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || !data.acceptedTerms}
          className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {pending ? "Składam zamówienie…" : `Złóż zamówienie — ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  );
}
