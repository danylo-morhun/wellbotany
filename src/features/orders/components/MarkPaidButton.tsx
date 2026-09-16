"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { markOrderPaid } from "../actions";

export function MarkPaidButton({ orderId }: { orderId: string }) {
  const { execute, isPending } = useAction(markOrderPaid, {
    onSuccess: () => toast.success("Zamówienie oznaczone jako opłacone"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd aktualizacji płatności"),
  });

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (window.confirm("Oznaczyć zamówienie jako opłacone?")) execute({ orderId });
      }}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
    >
      {isPending ? "Zapisywanie…" : "Oznacz jako opłacone"}
    </button>
  );
}
