"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { requestReviewForOrder } from "../actions";

type Props = { orderId: string; requestedAt: Date | null };

export function RequestReviewButton({ orderId, requestedAt }: Props) {
  const { execute, isPending } = useAction(requestReviewForOrder, {
    onSuccess: () => toast.success("Wysłano prośbę o opinię"),
    onError: ({ error }) => toast.error(error.serverError ?? "Nie udało się wysłać"),
  });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => execute({ orderId })}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
      >
        {isPending
          ? "Wysyłanie…"
          : requestedAt
            ? "Wyślij ponownie prośbę o opinię"
            : "Poproś o opinię"}
      </button>
      <span className="text-xs text-muted-foreground">
        {requestedAt
          ? `Wysłano ${requestedAt.toLocaleDateString("pl-PL")}`
          : "Wysyłana automatycznie po zmianie statusu na „Dostarczone”."}
      </span>
    </div>
  );
}
