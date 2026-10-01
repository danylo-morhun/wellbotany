"use client";

import { MoreHorizontal, Plus, TicketPercent } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPrice } from "@/lib/format";
import { deleteCoupon, toggleCoupon } from "../actions";
import { type CouponFormValues, CouponSheet } from "./CouponSheet";

export type CouponRow = CouponFormValues & {
  id: string;
  usageCount: number;
  state: "active" | "scheduled" | "expired" | "exhausted" | "off";
  discountGivenPln: number;
  revenuePln: number;
};

const STATE_BADGE = {
  active: { tone: "success", label: "Aktywny" },
  scheduled: { tone: "info", label: "Zaplanowany" },
  expired: { tone: "neutral", label: "Wygasł" },
  exhausted: { tone: "neutral", label: "Wyczerpany" },
  off: { tone: "neutral", label: "Wyłączony" },
} as const;

const dateFmt = (d: Date) =>
  d.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });

export function CouponsTable({ coupons, openNew }: { coupons: CouponRow[]; openNew?: boolean }) {
  const [editing, setEditing] = useState<CouponFormValues | null>(null);
  const [open, setOpen] = useState(!!openNew);
  const toggle = useAction(toggleCoupon, {
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu"),
  });
  const remove = useAction(deleteCoupon, {
    onSuccess: () => toast.success("Kod usunięty"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania"),
  });

  function openSheet(c: CouponFormValues | null) {
    setEditing(c);
    setOpen(true);
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="lg" onClick={() => openSheet(null)}>
          <Plus aria-hidden />
          Nowy kod
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-card px-6 py-14 text-center shadow-card">
          <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
            <TicketPercent className="size-5" />
          </span>
          <p className="text-sm font-medium">Brak kodów rabatowych</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Utwórz pierwszy kod — klienci wpiszą go w koszyku.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="h-10 px-4 font-medium">Kod</th>
                <th className="h-10 px-4 font-medium">Rabat</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 font-medium">Użycia</th>
                <th className="h-10 px-4 font-medium">Ważność</th>
                <th className="h-10 px-4 text-right font-medium">Sprzedaż z kodem</th>
                <th className="h-10 w-12 px-2" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const badge = STATE_BADGE[c.state];
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border/70 last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openSheet(c)}
                        className="font-mono font-semibold hover:text-primary"
                      >
                        {c.code}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {c.type === "PERCENTAGE" ? `−${c.value}%` : `−${formatPrice(c.value)}`}
                      {c.minOrderPln && (
                        <p className="text-xs text-muted-foreground">
                          od {formatPrice(c.minOrderPln)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={badge.tone} dot>
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.usageCount}
                      {c.maxUsages && (
                        <>
                          <span className="text-muted-foreground"> / {c.maxUsages}</span>
                          <div className="mt-1 h-1 w-16 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.min(100, (c.usageCount / c.maxUsages) * 100)}%`,
                              }}
                            />
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.validFrom || c.validUntil
                        ? `${c.validFrom ? dateFmt(c.validFrom) : "…"} – ${c.validUntil ? dateFmt(c.validUntil) : "…"}`
                        : "Bezterminowo"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPrice(c.revenuePln)}
                      {c.discountGivenPln > 0 && (
                        <p className="text-xs text-muted-foreground">
                          rabat {formatPrice(c.discountGivenPln)}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex size-8 items-center justify-center rounded-lg hover:bg-muted aria-expanded:bg-muted"
                          aria-label={`Akcje dla ${c.code}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openSheet(c)}>Edytuj</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggle.execute({ id: c.id, isActive: !c.isActive })}
                          >
                            {c.isActive ? "Wyłącz" : "Włącz"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            destructive
                            onClick={() => {
                              if (window.confirm(`Usunąć kod ${c.code}?`))
                                remove.execute({ id: c.id });
                            }}
                          >
                            Usuń
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <CouponSheet
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          coupon={editing}
        />
      )}
    </>
  );
}
