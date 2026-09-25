"use client";

import { ShoppingCart } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { useRefreshStorefront } from "@/features/session/components/StorefrontSessionProvider";
import { trackItems } from "@/lib/analytics";
import { addToCart } from "../actions";

type Props = {
  variantId: string;
  disabled?: boolean;
};

export function QuickAddButton({ variantId, disabled = false }: Props) {
  const refresh = useRefreshStorefront();
  const [succeeded, setSucceeded] = useState(false);

  const { execute, isExecuting } = useAction(addToCart, {
    onSuccess: ({ data, input }) => {
      if (data?.item) trackItems("add_to_cart", [{ ...data.item, quantity: input.quantity }]);
      void refresh();
      setSucceeded(true);
      setTimeout(() => setSucceeded(false), 1500);
      toast.success("Dodano do koszyka", {
        duration: 4000,
        action: {
          label: "Otwórz koszyk →",
          onClick: () => window.dispatchEvent(new Event("cart:open")),
        },
      });
    },
    onError: () => {
      toast.error("Błąd", { description: "Nie udało się dodać do koszyka" });
    },
  });

  return (
    <button
      type="button"
      disabled={disabled || isExecuting}
      onClick={(e) => {
        e.preventDefault();
        execute({ variantId, quantity: 1 });
      }}
      className="flex w-full items-center justify-center gap-1.5 rounded-full bg-secondary px-3 py-2.5 text-sm font-semibold text-secondary-foreground transition-[transform,background-color,color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary hover:text-primary-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <ShoppingCart className="size-4" strokeWidth={1.75} />
      <span
        key={isExecuting ? "loading" : succeeded ? "success" : "idle"}
        className="animate-[btn-text-in_200ms_ease-out_both] motion-reduce:animate-none"
      >
        {isExecuting ? "Dodawanie…" : succeeded ? "✓ Dodano" : "Do koszyka"}
      </span>
    </button>
  );
}
