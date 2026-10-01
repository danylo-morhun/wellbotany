"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Section, Switch, TextInput } from "@/features/products/components/editor/fields";
import { saveShopSettings } from "../actions";
import type { ShopSettings } from "../lib/shop-settings";

type Props = { settings: ShopSettings };

export function ShopSettingsForm({ settings }: Props) {
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(
    settings.freeShippingThresholdPln !== null,
  );
  const [metaSuffix, setMetaSuffix] = useState(settings.productMetaSuffixPl ?? "");
  const [thresholdError, setThresholdError] = useState<string>();

  const { execute, isPending } = useAction(saveShopSettings, {
    onSuccess: () => toast.success("Ustawienia zapisane"),
    onError: ({ error }) => toast.error("Błąd", { description: error.serverError }),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const threshold = Number(
      String(fd.get("freeShippingThreshold") ?? "")
        .replace(",", ".")
        .replace(/\s/g, ""),
    );
    if (freeShippingEnabled && !(Number.isFinite(threshold) && threshold > 0)) {
      setThresholdError("Podaj kwotę, np. 200");
      return;
    }
    setThresholdError(undefined);
    execute({
      freeShippingThresholdPln: freeShippingEnabled ? Math.round(threshold * 100) : null,
      productMetaSuffixPl: metaSuffix.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Section title="Dostawa">
        <Switch
          label="Darmowa dostawa od progu"
          description="Dotyczy wszystkich metod dostawy"
          checked={freeShippingEnabled}
          onChange={setFreeShippingEnabled}
        />
        {freeShippingEnabled && (
          <Field
            label="Próg darmowej dostawy"
            htmlFor="freeShippingThreshold"
            error={thresholdError}
            hint="Liczony od wartości produktów po rabatach, bez kosztu dostawy. Kwota pojawia się w nagłówku sklepu, w koszyku i na stronie „Dostawa”."
            className="max-w-xs"
          >
            <div className="relative">
              <TextInput
                id="freeShippingThreshold"
                name="freeShippingThreshold"
                inputMode="decimal"
                required
                defaultValue={((settings.freeShippingThresholdPln ?? 20000) / 100)
                  .toFixed(2)
                  .replace(".", ",")}
                className="pr-9"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                zł
              </span>
            </div>
          </Field>
        )}
      </Section>

      <Section title="Wyszukiwarki">
        <Field
          label="Dopisek do opisu produktów w Google"
          htmlFor="productMetaSuffix"
          counter={{ value: metaSuffix.length, max: 40 }}
          hint="Dodawany na końcu opisu każdego produktu w wynikach wyszukiwania (meta description). Puste pole — bez dopisku."
        >
          <TextInput
            id="productMetaSuffix"
            maxLength={40}
            value={metaSuffix}
            onChange={(e) => setMetaSuffix(e.target.value)}
            placeholder="np. Wysyłka w 24–48 h."
          />
        </Field>
      </Section>

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Zapisywanie…" : "Zapisz ustawienia"}
      </Button>
    </form>
  );
}
