"use client";

import type { GiftBuilderPricingMode, GiftBuilderSettings } from "@prisma/client";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  Section,
  Segmented,
  Switch,
  TextInput,
} from "@/features/products/components/editor/fields";
import { saveGiftBuilderSettings } from "../actions";

/** "12,50" / "12.50" → 1250; undefined when empty or not a positive amount */
function toGrosz(value: string): number | undefined {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return value.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined;
}

const zl = (grosz: number | null | undefined) =>
  grosz == null ? "" : (grosz / 100).toFixed(2).replace(".", ",");

type Props = { settings: GiftBuilderSettings | null };

export function GiftBuilderSettingsForm({ settings }: Props) {
  const [isActive, setIsActive] = useState(settings?.isActive ?? true);
  const [pricingMode, setPricingMode] = useState<GiftBuilderPricingMode>(
    settings?.pricingMode ?? "FIXED_BOX",
  );
  // Both mode fields stay in state so switching modes doesn't reset the other one
  const [boxPrice, setBoxPrice] = useState(zl(settings?.boxPricePln));
  const [discount, setDiscount] = useState(String(settings?.discountPercent ?? 0));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { execute, isPending } = useAction(saveGiftBuilderSettings, {
    onSuccess: () => toast.success("Ustawienia zapisane"),
    onError: ({ error }) => {
      const fieldErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(error.validationErrors ?? {})) {
        const msg = (v as { _errors?: string[] })?._errors?.[0];
        if (msg) fieldErrors[k] = msg;
      }
      setErrors(fieldErrors);
      if (error.serverError || !Object.keys(fieldErrors).length)
        toast.error("Błąd", { description: error.serverError });
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const minItems = Number(fd.get("minItems"));
    const maxItems = Number(fd.get("maxItems"));
    const next: Record<string, string> = {};
    if (pricingMode === "FIXED_BOX" && toGrosz(boxPrice) === undefined)
      next.boxPricePln = "Podaj cenę pudełka, np. 149,00";
    if (minItems > maxItems) next.maxItems = "Maksimum nie może być mniejsze niż minimum";
    setErrors(next);
    if (Object.keys(next).length) return;
    execute({
      isActive,
      namePl: String(fd.get("namePl") ?? "").trim(),
      pricingMode,
      boxPricePln: toGrosz(boxPrice),
      discountPercent: Number(discount || 0),
      minItems,
      maxItems,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Section title="Kreator">
        <Switch
          label="Kreator aktywny w sklepie"
          description="Klienci mogą złożyć własny zestaw na stronie Zestawy prezentowe"
          checked={isActive}
          onChange={setIsActive}
        />
        <Field label="Nazwa wyświetlana klientowi" htmlFor="namePl" error={errors.namePl}>
          <TextInput
            id="namePl"
            name="namePl"
            defaultValue={settings?.namePl ?? "Zestaw prezentowy"}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min. liczba produktów" htmlFor="minItems" error={errors.minItems}>
            <TextInput
              id="minItems"
              name="minItems"
              type="number"
              min={1}
              max={50}
              defaultValue={settings?.minItems ?? 3}
              required
            />
          </Field>
          <Field label="Maks. liczba produktów" htmlFor="maxItems" error={errors.maxItems}>
            <TextInput
              id="maxItems"
              name="maxItems"
              type="number"
              min={1}
              max={50}
              defaultValue={settings?.maxItems ?? 8}
              required
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Cena zestawu"
        description={
          <>
            Dopłatę za opakowanie ustawiasz osobno w sekcji{" "}
            <Link
              href="/admin/zestawy-prezentowe/opakowania"
              className="text-primary hover:underline"
            >
              Opakowania
            </Link>
            .
          </>
        }
      >
        <Segmented
          label="Model cenowy"
          value={pricingMode}
          onChange={setPricingMode}
          options={[
            { value: "FIXED_BOX", label: "Stała cena pudełka" },
            { value: "SUM_PLUS_FEE", label: "Suma cen produktów" },
          ]}
        />
        {pricingMode === "FIXED_BOX" ? (
          <Field
            label="Cena pudełka"
            htmlFor="boxPricePln"
            error={errors.boxPricePln}
            hint="Klient płaci tę kwotę niezależnie od wybranych produktów"
            className="max-w-xs"
          >
            <div className="relative">
              <TextInput
                id="boxPricePln"
                inputMode="decimal"
                value={boxPrice}
                onChange={(e) => setBoxPrice(e.target.value)}
                placeholder="0,00"
                className="pr-9"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                zł
              </span>
            </div>
          </Field>
        ) : (
          <Field
            label="Rabat od sumy produktów"
            htmlFor="discountPercent"
            error={errors.discountPercent}
            hint="Dodatnia wartość obniża cenę (10 = −10%), ujemna ją podwyższa (−10 = +10%). 0 = dokładna suma."
            className="max-w-xs"
          >
            <div className="relative">
              <TextInput
                id="discountPercent"
                type="number"
                step={1}
                min={-50}
                max={90}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="pr-9"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </Field>
        )}
      </Section>

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Zapisywanie…" : "Zapisz ustawienia"}
      </Button>
    </form>
  );
}
