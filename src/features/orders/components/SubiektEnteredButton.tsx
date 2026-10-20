"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { markOrderInSubiekt } from "../actions";

// Until the order is entered in Subiekt, the stock sync keeps its items off
// the shelf — otherwise Subiekt's unchanged count would put them back on sale.
export function SubiektEnteredButton({
  orderId,
  enteredAt,
}: {
  orderId: string;
  enteredAt: Date | null;
}) {
  const { execute, isPending } = useAction(markOrderInSubiekt, {
    onSuccess: ({ input }) =>
      toast.success(input.entered ? "Oznaczono: wprowadzone do Subiekta" : "Cofnięto oznaczenie"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu"),
  });

  if (enteredAt) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (window.confirm("Cofnąć? Zamówienie znów będzie blokować stan z Subiekta."))
            execute({ orderId, entered: false });
        }}
        className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
      >
        {isPending ? "Zapisywanie…" : "Cofnij oznaczenie Subiekta"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Po wystawieniu dokumentu w Subiekcie oznacz zamówienie — do tego czasu jego produkty są
        odejmowane od stanu z Subiekta.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() => execute({ orderId, entered: true })}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
      >
        {isPending ? "Zapisywanie…" : "Wprowadzone do Subiekta"}
      </button>
    </div>
  );
}
