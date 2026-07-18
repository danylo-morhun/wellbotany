"use client";

import { Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { addCuratedGiftSetToCart } from "../actions";

type Props = { giftSetId: string; disabled?: boolean };

export function AddCuratedGiftSetButton({ giftSetId, disabled = false }: Props) {
  const router = useRouter();
  const [succeeded, setSucceeded] = useState(false);

  const { execute, isExecuting } = useAction(addCuratedGiftSetToCart, {
    onSuccess: () => {
      router.refresh();
      setSucceeded(true);
      setTimeout(() => setSucceeded(false), 1500);
      toast.success("Zestaw dodany do koszyka", {
        duration: 4000,
        action: {
          label: "Otwórz koszyk →",
          onClick: () => window.dispatchEvent(new Event("cart:open")),
        },
      });
    },
    onError: ({ error }) => {
      toast.error("Błąd", { description: error.serverError ?? "Nie udało się dodać zestawu" });
    },
  });

  return (
    <button
      type="button"
      disabled={disabled || isExecuting}
      onClick={() => execute({ giftSetId })}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <Gift className="size-4" strokeWidth={1.75} />
      {isExecuting ? "Dodawanie…" : succeeded ? "✓ Dodano" : "Dodaj zestaw do koszyka"}
    </button>
  );
}
