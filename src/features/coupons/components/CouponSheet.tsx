"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { saveCoupon } from "../actions";

export type CouponFormValues = {
  id?: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minOrderPln: number | null;
  maxUsages: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
};

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50";

const toDateInput = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "";
const zl = (grosz: number | null) => (grosz == null ? "" : String(grosz / 100).replace(".", ","));
const toGrosz = (v: string) => {
  const n = Number(v.replace(",", ".").replace(/\s/g, ""));
  return v.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

export function CouponSheet({
  open,
  onOpenChange,
  coupon,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: CouponFormValues | null;
}) {
  const [type, setType] = useState(coupon?.type ?? "PERCENTAGE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { execute, isPending } = useAction(saveCoupon, {
    onSuccess: () => {
      toast.success(coupon?.id ? "Kod zaktualizowany" : "Kod utworzony");
      onOpenChange(false);
    },
    onError: ({ error }) => {
      const fieldErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(error.validationErrors ?? {})) {
        const msg = (v as { _errors?: string[] })?._errors?.[0];
        if (msg) fieldErrors[k] = msg;
      }
      setErrors(fieldErrors);
      if (error.serverError) toast.error(error.serverError);
    },
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    const valueRaw = get("value");
    const from = get("validFrom");
    const until = get("validUntil");
    setErrors({});
    execute({
      id: coupon?.id,
      code: get("code"),
      type,
      value: type === "PERCENTAGE" ? Math.round(Number(valueRaw)) || 0 : (toGrosz(valueRaw) ?? 0),
      minOrderPln: toGrosz(get("minOrder")),
      maxUsages: get("maxUsages") ? Math.round(Number(get("maxUsages"))) : null,
      // Dates are whole days in the admin's (Polish) local time
      validFrom: from ? new Date(`${from}T00:00:00`) : null,
      validUntil: until ? new Date(`${until}T23:59:59`) : null,
      isActive: fd.get("isActive") === "on",
    });
  }

  const err = (k: string) =>
    errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-md">
        <SheetTitle className="mb-6 text-lg font-semibold">
          {coupon?.id ? `Edytuj kod ${coupon.code}` : "Nowy kod rabatowy"}
        </SheetTitle>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium">
              Kod
            </label>
            <input
              id="code"
              name="code"
              required
              defaultValue={coupon?.code}
              placeholder="np. JESIEN10"
              className={`${inputClass} font-mono uppercase`}
            />
            {err("code")}
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Rodzaj rabatu</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  ["PERCENTAGE", "Procentowy"],
                  ["FIXED_AMOUNT", "Kwotowy"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  aria-pressed={type === value}
                  className="h-8 rounded-md text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-card"
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="value" className="mb-1 block text-sm font-medium">
              Wartość rabatu
            </label>
            <div className="relative">
              <input
                id="value"
                name="value"
                required
                inputMode="decimal"
                key={type}
                defaultValue={
                  coupon && coupon.type === type
                    ? type === "PERCENTAGE"
                      ? String(coupon.value)
                      : zl(coupon.value)
                    : ""
                }
                className={`${inputClass} pr-10`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                {type === "PERCENTAGE" ? "%" : "zł"}
              </span>
            </div>
            {err("value")}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="minOrder" className="mb-1 block text-sm font-medium">
                Min. wartość koszyka
              </label>
              <div className="relative">
                <input
                  id="minOrder"
                  name="minOrder"
                  inputMode="decimal"
                  defaultValue={zl(coupon?.minOrderPln ?? null)}
                  placeholder="brak"
                  className={`${inputClass} pr-10`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  zł
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="maxUsages" className="mb-1 block text-sm font-medium">
                Limit użyć
              </label>
              <input
                id="maxUsages"
                name="maxUsages"
                type="number"
                min={1}
                defaultValue={coupon?.maxUsages ?? ""}
                placeholder="bez limitu"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="validFrom" className="mb-1 block text-sm font-medium">
                Ważny od
              </label>
              <input
                id="validFrom"
                name="validFrom"
                type="date"
                defaultValue={toDateInput(coupon?.validFrom ?? null)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="validUntil" className="mb-1 block text-sm font-medium">
                Ważny do
              </label>
              <input
                id="validUntil"
                name="validUntil"
                type="date"
                defaultValue={toDateInput(coupon?.validUntil ?? null)}
                className={inputClass}
              />
              {err("validUntil")}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={coupon?.isActive ?? true}
              className="size-4 accent-primary"
            />
            Aktywny
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? "Zapisywanie…" : "Zapisz"}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
