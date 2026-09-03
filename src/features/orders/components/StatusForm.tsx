"use client";

import type { OrderStatus } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { updateOrderStatus } from "../actions";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Oczekujące",
  PAYMENT_PENDING: "Oczekuje na płatność",
  PAID: "Opłacone",
  PROCESSING: "W realizacji",
  SHIPPED: "Wysłane",
  DELIVERED: "Dostarczone",
  CANCELLED: "Anulowane",
  REFUNDED: "Zwrócone",
};

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
  currentNote: string | null;
  currentTrackingNumber: string | null;
}

export function StatusForm({ orderId, currentStatus, currentNote, currentTrackingNumber }: Props) {
  const { execute, isPending } = useAction(updateOrderStatus, {
    onSuccess: () => toast.success("Status zamówienia zaktualizowany"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd aktualizacji statusu"),
  });
  const [status, setStatus] = useState<OrderStatus>(currentStatus);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    execute({
      orderId,
      status: fd.get("status") as OrderStatus,
      noteAdmin: (fd.get("noteAdmin") as string) || undefined,
      trackingNumber: (fd.get("trackingNumber") as string) || undefined,
    });
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
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {status === "SHIPPED" && (
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
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Wpisz numer po utworzeniu etykiety u przewoźnika — wyślemy klientowi e-mail z numerem i
            linkiem do śledzenia.
          </p>
        </div>
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
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
      >
        {isPending ? "Zapisywanie…" : "Zapisz"}
      </button>
    </form>
  );
}
