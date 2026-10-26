"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { markOrderPaid } from "../actions";

export function MarkPaidButton({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const { execute, isPending } = useAction(markOrderPaid, {
    onSuccess: () => toast.success("Zamówienie oznaczone jako opłacone"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd aktualizacji płatności"),
    onSettled: () => setConfirming(false),
  });

  return (
    <>
      <Button size="lg" disabled={isPending} onClick={() => setConfirming(true)}>
        {isPending ? "Zapisywanie…" : "Oznacz jako opłacone"}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Oznaczyć zamówienie jako opłacone?"
        description="Płatność zostanie zapisana jako otrzymana, a zamówienie czekające na płatność przejdzie do statusu „Opłacone”."
        confirmLabel="Oznacz jako opłacone"
        tone="default"
        pendingLabel="Zapisywanie…"
        pending={isPending}
        onConfirm={() => execute({ orderId })}
      />
    </>
  );
}
