"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
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
  const [confirming, setConfirming] = useState(false);
  const { execute, isPending } = useAction(markOrderInSubiekt, {
    onSuccess: ({ input }) =>
      toast.success(input.entered ? "Oznaczono: wprowadzone do Subiekta" : "Cofnięto oznaczenie"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu"),
    onSettled: () => setConfirming(false),
  });

  if (enteredAt) {
    return (
      <>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setConfirming(true)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
        >
          {isPending ? "Zapisywanie…" : "Cofnij oznaczenie Subiekta"}
        </button>
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Cofnąć oznaczenie Subiekta?"
          description="Zamówienie znów będzie blokować stan z Subiekta."
          confirmLabel="Cofnij oznaczenie"
          tone="default"
          pendingLabel="Zapisywanie…"
          pending={isPending}
          onConfirm={() => execute({ orderId, entered: false })}
        />
      </>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Po wystawieniu dokumentu w Subiekcie oznacz zamówienie — do tego czasu jego produkty są
        odejmowane od stanu z Subiekta.
      </p>
      <Button size="lg" disabled={isPending} onClick={() => execute({ orderId, entered: true })}>
        {isPending ? "Zapisywanie…" : "Wprowadzone do Subiekta"}
      </Button>
    </div>
  );
}
