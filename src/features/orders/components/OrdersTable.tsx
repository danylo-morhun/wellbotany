"use client";

import type { OrderStatus } from "@prisma/client";
import { MessageSquareText, Printer, ReceiptText, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { bulkUpdateOrderStatus } from "../actions";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, orderStatusLabel } from "../lib/status-labels";
import { BULK_ORDER_STATUSES } from "../schema";

export type OrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  shippingMethod: string;
  shippingLabel: string;
  shippingDetail: string | null;
  paymentLabel: string;
  isPaid: boolean;
  totalPln: number;
  customerName: string;
  customerEmail: string;
  dateLabel: string;
  itemCount: number;
  wantsFaktura: boolean;
  hasCustomerNote: boolean;
};

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = orders.length > 0 && selected.size === orders.length;

  const { execute, isPending } = useAction(bulkUpdateOrderStatus, {
    onSuccess: ({ data }) => {
      if (!data) return;
      if (data.updated) toast.success(`Zaktualizowano zamówienia: ${data.updated}`);
      for (const f of data.failed) {
        const num = orders.find((o) => o.id === f.orderId)?.orderNumber ?? f.orderId;
        toast.error(`${num}: ${f.error}`);
      }
      setSelected(new Set());
      router.refresh();
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd aktualizacji"),
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const ids = [...selected];

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="h-10 w-10 pl-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = selected.size > 0 && !allSelected;
                  }}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)))
                  }
                  aria-label="Zaznacz wszystkie"
                  className="accent-primary"
                />
              </th>
              <th className="h-10 px-3 font-medium">Zamówienie</th>
              <th className="h-10 px-3 font-medium">Klient</th>
              <th className="h-10 px-3 font-medium">Dostawa</th>
              <th className="h-10 px-3 font-medium">Płatność</th>
              <th className="h-10 px-3 font-medium">Status</th>
              <th className="h-10 px-4 text-right font-medium">Kwota</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const isSelected = selected.has(o.id);
              return (
                <tr
                  key={o.id}
                  onClick={(e) => {
                    // Row click opens the order, except on the checkbox / links
                    if ((e.target as HTMLElement).closest("input,a,button")) return;
                    router.push(`/admin/zamowienia/${o.id}`);
                  }}
                  className={cn(
                    "cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-muted/40 motion-reduce:transition-none",
                    isSelected && "bg-secondary/50 hover:bg-secondary/60",
                  )}
                >
                  <td className="w-10 py-3 pl-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(o.id)}
                      aria-label={`Zaznacz ${o.orderNumber}`}
                      className="accent-primary"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/zamowienia/${o.id}`}
                      className="font-medium whitespace-nowrap tabular-nums hover:text-primary"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">
                      {o.dateLabel} · {o.itemCount} szt.
                    </p>
                  </td>
                  <td className="max-w-56 px-3 py-3">
                    <p className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{o.customerName}</span>
                      {o.wantsFaktura && (
                        <ReceiptText
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-label="Faktura VAT"
                        />
                      )}
                      {o.hasCustomerNote && (
                        <MessageSquareText
                          className="size-3.5 shrink-0 text-info"
                          aria-label="Uwagi klienta"
                        />
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{o.customerEmail}</p>
                  </td>
                  <td className="max-w-52 px-3 py-3">
                    <p className="truncate">{o.shippingLabel}</p>
                    {o.shippingDetail && (
                      <p className="truncate text-xs text-muted-foreground">{o.shippingDetail}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={o.isPaid ? "success" : "warning"}>
                      {o.isPaid ? "Opłacone" : "Nieopłacone"}
                    </Badge>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {o.paymentLabel}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={ORDER_STATUS_TONE[o.status]} dot>
                      {orderStatusLabel(o.status, o.shippingMethod)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatPrice(o.totalPln)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-sm text-background shadow-float">
          <span className="px-1 font-medium tabular-nums">Zaznaczono: {selected.size}</span>
          <span className="h-5 w-px bg-background/20" />
          <Link
            href={`/admin/zamowienia/druk?ids=${ids.join(",")}`}
            target="_blank"
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 font-medium hover:bg-background/10"
          >
            <Printer className="size-4" aria-hidden />
            Drukuj listy pakowania
          </Link>
          <select
            aria-label="Zmień status zaznaczonych"
            disabled={isPending}
            value=""
            onChange={(e) => {
              const status = e.target.value as (typeof BULK_ORDER_STATUSES)[number];
              if (!status) return;
              if (
                window.confirm(
                  `Zmienić status zaznaczonych zamówień (${selected.size}) na „${ORDER_STATUS_LABELS[status]}”? ${
                    status === "CANCELLED"
                      ? "Produkty wrócą na stan, a kody rabatowe zostaną zwolnione."
                      : "Klienci dostaną odpowiednie e-maile."
                  }`,
                )
              ) {
                execute({ orderIds: ids, status });
              }
            }}
            className="h-8 rounded-lg bg-background/10 px-2 font-medium text-background outline-none [&>option]:text-foreground"
          >
            <option value="">{isPending ? "Zapisywanie…" : "Zmień status…"}</option>
            {BULK_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
                {s === "SHIPPED" ? " (tylko odbiór osobisty / z nr przesyłki)" : ""}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelected(new Set())}
            aria-label="Odznacz"
            className="text-background hover:bg-background/10 hover:text-background"
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  );
}
