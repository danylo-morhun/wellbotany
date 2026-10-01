"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { bulkMarkOrdersPaid } from "../actions";
import { matchTransfers } from "../lib/reconcile";

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalPln: number;
  ageLabel: string;
  ageDays: number;
};

export function TransferReconciler({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [statement, setStatement] = useState("");
  // Amount-matching orders start ticked, mismatches unticked; this holds the admin's flips
  const [toggled, setToggled] = useState<Set<string>>(new Set());

  const matches = useMemo(
    () => (statement.trim() ? matchTransfers(statement, orders) : []),
    [statement, orders],
  );
  const byId = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const matchedIds = new Set(matches.map((m) => m.orderId));
  const isChecked = (m: { orderId: string; amountMatches: boolean }) =>
    m.amountMatches !== toggled.has(m.orderId);
  const selected = matches.filter(isChecked).map((m) => m.orderId);

  const { execute, isPending } = useAction(bulkMarkOrdersPaid, {
    onSuccess: ({ data }) => {
      if (!data) return;
      toast.success(`Oznaczono jako opłacone: ${data.updated}`);
      for (const f of data.failed) toast.error(`${byId.get(f.orderId)?.orderNumber}: ${f.error}`);
      setStatement("");
      setToggled(new Set());
      router.refresh();
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu"),
  });

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <label htmlFor="statement" className="mb-2 block text-sm font-semibold">
            Wyciąg z banku
          </label>
          <textarea
            id="statement"
            value={statement}
            onChange={(e) => {
              setStatement(e.target.value);
              setToggled(new Set());
            }}
            rows={10}
            placeholder={
              "Wklej tutaj historię operacji (Ctrl+V)…\n\nnp. 30.09.2026  Jan Kowalski  Zamówienie TZ-2026-00042  +129,90 PLN"
            }
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>

        {statement.trim() && (
          <div className="rounded-2xl bg-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <p className="text-sm font-semibold">
                Dopasowane: {matches.length} z {orders.length}
              </p>
              <Button
                size="lg"
                disabled={selected.length === 0 || isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Oznaczyć zaznaczone zamówienia (${selected.length}) jako opłacone?`,
                    )
                  ) {
                    execute({ orderIds: selected });
                  }
                }}
              >
                {isPending ? "Zapisywanie…" : `Oznacz jako opłacone (${selected.length})`}
              </Button>
            </div>
            {matches.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nie znaleziono numerów nieopłaconych zamówień w tym tekście.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {matches.map((m) => {
                  const order = byId.get(m.orderId);
                  if (!order) return null;
                  const checked = isChecked(m);
                  return (
                    <li key={m.orderId} className="flex items-start gap-3 px-5 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setToggled((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.orderId)) next.delete(m.orderId);
                            else next.add(m.orderId);
                            return next;
                          })
                        }
                        aria-label={`Zaznacz ${order.orderNumber}`}
                        className="mt-1 accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/zamowienia/${order.id}`}
                            className="font-medium tabular-nums hover:text-primary"
                          >
                            {order.orderNumber}
                          </Link>
                          <span className="text-sm text-muted-foreground">
                            {order.customerName}
                          </span>
                          <span className="ml-auto font-medium tabular-nums">
                            {formatPrice(order.totalPln)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                          {m.line}
                        </p>
                        {m.amountMatches ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="size-3.5" aria-hidden /> Kwota się zgadza
                          </p>
                        ) : (
                          <p className="mt-1 flex items-center gap-1 text-xs text-warning-foreground">
                            <AlertTriangle className="size-3.5" aria-hidden />
                            {m.amounts.length
                              ? `Kwota w wyciągu: ${m.amounts.map(formatPrice).join(", ")} — sprawdź`
                              : "Nie znaleziono kwoty obok — sprawdź ręcznie"}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card shadow-card lg:sticky lg:top-20">
        <p className="border-b border-border px-5 py-3 text-sm font-semibold">
          Czeka na przelew ({orders.length})
        </p>
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Wszystkie przelewy rozliczone.
          </p>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/zamowienia/${o.id}`}
                    className="font-medium tabular-nums hover:text-primary"
                  >
                    {o.orderNumber}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.customerName} · {o.ageLabel}
                  </p>
                </div>
                {matchedIds.has(o.id) ? (
                  <Badge tone="success">w wyciągu</Badge>
                ) : o.ageDays >= 3 ? (
                  <Badge tone="warning">{o.ageDays} dni</Badge>
                ) : null}
                <span className="font-medium tabular-nums">{formatPrice(o.totalPln)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
