"use client";

import type { OrderStatus } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/features/products/components/editor/fields";
import { cn } from "@/lib/utils";
import { updateOrderStatus } from "../actions";
import {
  ORDER_STATUS_LABELS,
  orderStatusLabel,
  statusChangeConsequence,
} from "../lib/status-labels";
import type { UpdateOrderStatusInput } from "../schema";

const CONFIRM_STATUSES: OrderStatus[] = ["CANCELLED", "SHIPPED"];

interface Props {
  orderId: string;
  shippingMethod: string;
  currentStatus: OrderStatus;
  currentNote: string | null;
  currentTrackingNumber: string | null;
}

export function StatusForm({
  orderId,
  shippingMethod,
  currentStatus,
  currentNote,
  currentTrackingNumber,
}: Props) {
  const isPickup = shippingMethod === "PICKUP";
  const [pendingInput, setPendingInput] = useState<UpdateOrderStatusInput | null>(null);
  const { execute, isPending } = useAction(updateOrderStatus, {
    onSuccess: () => toast.success("Zapisano zmiany"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd aktualizacji statusu"),
    onSettled: () => setPendingInput(null),
  });
  const [status, setStatus] = useState<OrderStatus>(currentStatus);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input: UpdateOrderStatusInput = {
      orderId,
      status: fd.get("status") as OrderStatus,
      // Always sent (even empty) so the note can be cleared
      noteAdmin: (fd.get("noteAdmin") as string) ?? "",
      trackingNumber: (fd.get("trackingNumber") as string) || undefined,
    };
    // Cancelling and shipping touch stock or e-mail the customer — confirm first
    const risky = input.status !== currentStatus && CONFIRM_STATUSES.includes(input.status);
    if (risky) setPendingInput(input);
    else execute(input);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="status">
          Status zamówienia
        </label>
        <select
          id="status"
          name="status"
          defaultValue={currentStatus}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
          className={cn(inputClass, "bg-card py-2")}
        >
          {Object.keys(ORDER_STATUS_LABELS).map((value) => (
            <option key={value} value={value}>
              {orderStatusLabel(value, shippingMethod)}
            </option>
          ))}
        </select>
      </div>
      {status === "SHIPPED" && !isPickup && (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="trackingNumber">
            Numer przesyłki
          </label>
          <input
            id="trackingNumber"
            name="trackingNumber"
            type="text"
            required={!currentTrackingNumber}
            defaultValue={currentTrackingNumber ?? ""}
            placeholder="np. 1234567890"
            className={cn(inputClass, "bg-card py-2")}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Wpisz numer po utworzeniu etykiety u przewoźnika — wyślemy klientowi e-mail z numerem i
            linkiem do śledzenia.
          </p>
        </div>
      )}
      {status === "CANCELLED" && currentStatus !== "CANCELLED" && (
        <p className="text-xs text-muted-foreground">
          Produkty wrócą na stan magazynowy, a użycie kodu rabatowego zostanie zwolnione.
        </p>
      )}
      {currentStatus === "CANCELLED" && status !== "CANCELLED" && (
        <p className="text-xs text-muted-foreground">
          Produkty zostaną ponownie zdjęte ze stanu, a kod rabatowy policzony jako użyty.
        </p>
      )}
      {status === "SHIPPED" && isPickup && (
        <p className="text-xs text-muted-foreground">
          Po zapisaniu wyślemy klientowi e-mail, że zamówienie czeka na odbiór.
        </p>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="noteAdmin">
          Notatka admina
        </label>
        <textarea
          id="noteAdmin"
          name="noteAdmin"
          defaultValue={currentNote ?? ""}
          rows={3}
          className={cn(inputClass, "bg-card py-2")}
        />
      </div>
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Zapisywanie…" : "Zapisz"}
      </Button>
      <ConfirmDialog
        open={pendingInput !== null}
        onOpenChange={(open) => !open && setPendingInput(null)}
        title={`Zmienić status na „${orderStatusLabel(pendingInput?.status ?? "", shippingMethod)}”?`}
        description={statusChangeConsequence(pendingInput?.status ?? "", shippingMethod) ?? ""}
        confirmLabel="Zmień status"
        tone={pendingInput?.status === "CANCELLED" ? "destructive" : "default"}
        pendingLabel="Zapisywanie…"
        pending={isPending}
        onConfirm={() => pendingInput && execute(pendingInput)}
      />
    </form>
  );
}
