"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { verifyCoupon } from "@/features/checkout/actions";
import { formatPrice } from "@/lib/format";
import { clearSavedCoupon, readSavedCoupon, saveCoupon } from "../lib/saved-coupon";

type CouponState = {
  valid: boolean;
  discountPln: number;
  message: string | null;
};

type Props = {
  subtotal: number;
  saleSubtotal: number;
  onDiscount: (discountPln: number) => void;
};

export function CouponInput({ subtotal, saleSubtotal, onDiscount }: Props) {
  const [code, setCode] = useState("");
  const [couponState, setCouponState] = useState<CouponState | null>(null);

  const { execute, isExecuting } = useAction(verifyCoupon, {
    onSuccess: ({ data, input }) => {
      if (!data) return;
      if (data.valid) saveCoupon(input.code);
      else if (input.code === readSavedCoupon()) clearSavedCoupon();
      setCouponState(data);
      onDiscount(data.valid ? data.discountPln : 0);
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd sprawdzania kodu rabatowego"),
  });

  // A code from the welcome e-mail (or an earlier visit) applies itself
  // biome-ignore lint/correctness/useExhaustiveDependencies: once on mount
  useEffect(() => {
    const saved = readSavedCoupon();
    if (!saved) return;
    setCode(saved);
    execute({ code: saved, subtotal, saleSubtotal });
  }, []);

  const handleVerify = () => {
    if (!code.trim()) return;
    execute({ code, subtotal, saleSubtotal });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
    if (couponState) {
      setCouponState(null);
      onDiscount(0);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={handleChange}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          placeholder="Kod rabatowy"
          aria-label="Kod rabatowy"
          aria-describedby="cart-coupon-result"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-[border-color,box-shadow] duration-150"
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={isExecuting || !code.trim()}
          className="shrink-0 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium whitespace-nowrap transition-[background-color,opacity] duration-150 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isExecuting ? "…" : "Zastosuj"}
        </button>
      </div>
      {/* Mounted before the result arrives, so screen readers announce it */}
      <p
        id="cart-coupon-result"
        role="status"
        className={`mt-2 text-xs font-medium empty:mt-0 ${couponState?.valid ? "text-success" : "text-destructive"}`}
      >
        {couponState &&
          (couponState.valid
            ? `✓ Rabat: -${formatPrice(couponState.discountPln)}${couponState.message ? ` · ${couponState.message}` : ""}`
            : couponState.message)}
      </p>
    </div>
  );
}
