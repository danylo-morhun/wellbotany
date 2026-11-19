"use client";

import type { OrderStatus } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "../actions";

type Props = {
  orderId: string;
  status: OrderStatus;
  label: string;
  /** Shown in a confirm dialog first — for changes that e-mail the customer */
  confirm?: { title: string; description: string };
  variant?: "default" | "outline";
};

/** One-click status change for the order's next step. */
export function StatusActionButton({ orderId, status, label, confirm, variant }: Props) {
  const [confirming, setConfirming] = useState(false);
  const { execute, isPending } = useAction(updateOrderStatus, {
    onSuccess: () => toast.success("Zapisano"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd aktualizacji statusu"),
    onSettled: () => setConfirming(false),
  });
  const run = () => execute({ orderId, status });

  return (
    <>
      <Button
        size="lg"
        variant={variant}
        disabled={isPending}
        onClick={() => (confirm ? setConfirming(true) : run())}
      >
        {isPending ? "Zapisywanie…" : label}
      </Button>
      {confirm && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={label}
          tone="default"
          pendingLabel="Zapisywanie…"
          pending={isPending}
          onConfirm={run}
        />
      )}
    </>
  );
}
