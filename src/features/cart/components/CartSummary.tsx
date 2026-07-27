"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { CouponInput } from "./CouponInput";

type Props = { subtotal: number };

export function CartSummary({ subtotal }: Props) {
  const [discount, setDiscount] = useState(0);
  const total = subtotal - discount;

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Podsumowanie zamówienia</h2>
      </div>

      <div className="space-y-3 px-6 py-5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Wartość produktów</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rabat</span>
            <span className="font-medium text-success">-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Dostawa</span>
          <span className="text-muted-foreground">Obliczana przy kasie</span>
        </div>

        <div className="flex justify-between border-t border-border pt-3 text-base">
          <span className="font-semibold">Razem</span>
          <span className="font-bold">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <CouponInput subtotal={subtotal} onDiscount={setDiscount} />
      </div>

      <div className="px-6 pb-5">
        <Link
          href="/zamowienie"
          className="block w-full rounded-full bg-primary px-4 py-3.5 text-center text-sm font-semibold text-primary-foreground transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Przejdź do kasy
        </Link>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Bezpieczna płatność · Szybka wysyłka
        </p>
      </div>
    </div>
  );
}
