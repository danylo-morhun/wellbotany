"use client";

import type { GiftBuilderPricingMode, GiftBuilderSettings } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { saveGiftBuilderSettings } from "../actions";

function plnToGrosze(value: string): number {
  return Math.round(Number.parseFloat(value || "0") * 100);
}

function groszeToPln(grosze: number | null): string {
  return grosze === null ? "" : (grosze / 100).toFixed(2);
}

const MODE_LABELS: Record<GiftBuilderPricingMode, string> = {
  FIXED_BOX: "Stała cena pudełka",
  SUM_PLUS_FEE: "Suma cen produktów + opłata za pakowanie",
};

type Props = { settings: GiftBuilderSettings | null };

export function GiftBuilderSettingsForm({ settings }: Props) {
  const [isActive, setIsActive] = useState(settings?.isActive ?? true);
  const [pricingMode, setPricingMode] = useState<GiftBuilderPricingMode>(
    settings?.pricingMode ?? "FIXED_BOX",
  );

  const { execute, isPending } = useAction(saveGiftBuilderSettings, {
    onSuccess: () => toast.success("Ustawienia zapisane"),
    onError: ({ error }) => toast.error("Błąd", { description: error.serverError }),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const boxPriceRaw = fd.get("boxPricePln") as string;
    execute({
      isActive,
      namePl: fd.get("namePl") as string,
      pricingMode,
      boxPricePln: boxPriceRaw ? plnToGrosze(boxPriceRaw) : undefined,
      packagingFeePln: plnToGrosze((fd.get("packagingFeePln") as string) || "0"),
      minItems: Number(fd.get("minItems")),
      maxItems: Number(fd.get("maxItems")),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-2xl bg-card p-5 shadow-card"
    >
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Kreator zestawów aktywny na sklepie
      </label>

      <div>
        <label htmlFor="namePl" className="mb-1 block text-xs font-medium text-muted-foreground">
          Nazwa wyświetlana klientowi
        </label>
        <input
          id="namePl"
          name="namePl"
          defaultValue={settings?.namePl ?? "Zestaw prezentowy"}
          required
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-medium text-muted-foreground">Model cenowy</legend>
        {(Object.entries(MODE_LABELS) as [GiftBuilderPricingMode, string][]).map(
          ([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                pricingMode === value ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <input
                type="radio"
                name="pricingMode"
                value={value}
                checked={pricingMode === value}
                onChange={() => setPricingMode(value)}
              />
              {label}
            </label>
          ),
        )}
      </fieldset>

      {pricingMode === "FIXED_BOX" ? (
        <div>
          <label
            htmlFor="boxPricePln"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Cena pudełka (PLN) *
          </label>
          <input
            id="boxPricePln"
            name="boxPricePln"
            type="number"
            step="0.01"
            min="0"
            defaultValue={groszeToPln(settings?.boxPricePln ?? null)}
            required
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
          />
        </div>
      ) : (
        <div>
          <label
            htmlFor="packagingFeePln"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Opłata za pakowanie (PLN)
          </label>
          <input
            id="packagingFeePln"
            name="packagingFeePln"
            type="number"
            step="0.01"
            min="0"
            defaultValue={groszeToPln(settings?.packagingFeePln ?? 0)}
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="minItems"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Min. liczba produktów
          </label>
          <input
            id="minItems"
            name="minItems"
            type="number"
            min={1}
            max={50}
            defaultValue={settings?.minItems ?? 3}
            required
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="maxItems"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Maks. liczba produktów
          </label>
          <input
            id="maxItems"
            name="maxItems"
            type="number"
            min={1}
            max={50}
            defaultValue={settings?.maxItems ?? 8}
            required
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
      >
        {isPending ? "Zapisywanie…" : "Zapisz ustawienia"}
      </button>
    </form>
  );
}
