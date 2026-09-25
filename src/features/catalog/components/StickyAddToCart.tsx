"use client";

import { useAction } from "next-safe-action/hooks";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addToCart } from "@/features/cart/actions";
import { useRefreshStorefront } from "@/features/session/components/StorefrontSessionProvider";
import { trackItems } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";

type Props = {
  productName: string;
  selectedVariantId: string;
  price: number;
  stock: number;
  anchorRef: RefObject<HTMLElement | null>;
};

export function StickyAddToCart({
  productName,
  selectedVariantId,
  price,
  stock,
  anchorRef,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useRefreshStorefront();

  const { execute, isExecuting } = useAction(addToCart, {
    onSuccess: ({ data, input }) => {
      if (data?.item) trackItems("add_to_cart", [{ ...data.item, quantity: input.quantity }]);
      void refresh();
      if (successTimer.current) clearTimeout(successTimer.current);
      setSucceeded(true);
      successTimer.current = setTimeout(() => setSucceeded(false), 1500);
      toast.success("Dodano do koszyka", {
        duration: 4000,
        action: {
          label: "Otwórz koszyk →",
          onClick: () => window.dispatchEvent(new Event("cart:open")),
        },
      });
    },
    onError: () => toast.error("Błąd dodawania"),
  });

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [anchorRef]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div>
          <p className="line-clamp-1 text-sm font-semibold">{productName}</p>
          <p className="text-lg font-bold text-primary">{formatPrice(price)}</p>
        </div>
        <button
          type="button"
          onClick={() => execute({ variantId: selectedVariantId, quantity: 1 })}
          disabled={isExecuting || stock <= 0}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-[transform,background-color,color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <span
            key={stock <= 0 ? "brak" : isExecuting ? "loading" : succeeded ? "success" : "idle"}
            className="animate-[btn-text-in_200ms_ease-out_both]"
          >
            {stock <= 0 ? "Brak" : isExecuting ? "…" : succeeded ? "✓ Dodano" : "Dodaj do koszyka"}
          </span>
        </button>
      </div>
    </div>
  );
}
