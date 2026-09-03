"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { verifyCoupon } from "@/features/checkout/actions";
import { formatPrice } from "@/lib/format";

type CouponState = {
  valid: boolean;
  discountPln: number;
  message: string | null;
};

type Props = {
  subtotal: number;
  onDiscount: (discountPln: number) => void;
};

export function CouponInput({ subtotal, onDiscount }: Props) {
  const [code, setCode] = useState("");
  const [couponState, setCouponState] = useState<CouponState | null>(null);

  const { execute, isExecuting } = useAction(verifyCoupon, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setCouponState(data);
      onDiscount(data.valid ? data.discountPln : 0);
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd sprawdzania kodu rabatowego"),
  });

  const handleVerify = () => {
    if (!code.trim()) return;
    execute({ code, subtotal });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
    if (couponState) {
      setCouponState(null);
      onDiscount(0);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={handleChange}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          placeholder="Kod rabatowy"
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
      {couponState && (
        <p
          className={`text-xs font-medium ${couponState.valid ? "text-success" : "text-destructive"}`}
        >
          {couponState.valid
            ? `✓ Rabat: -${formatPrice(couponState.discountPln)}`
            : couponState.message}
        </p>
      )}
    </div>
  );
}
