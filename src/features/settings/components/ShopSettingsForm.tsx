"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { saveShopSettings } from "../actions";
import type { ShopSettings } from "../lib/shop-settings";

type Props = { settings: ShopSettings };

export function ShopSettingsForm({ settings }: Props) {
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(
    settings.freeShippingThresholdPln !== null,
  );

  const { execute, isPending } = useAction(saveShopSettings, {
    onSuccess: () => toast.success("Ustawienia zapisane"),
    onError: ({ error }) => toast.error("Błąd", { description: error.serverError }),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const threshold = Number.parseFloat(
      String(fd.get("freeShippingThreshold") ?? "").replace(",", "."),
    );
    const metaSuffix = String(fd.get("productMetaSuffix") ?? "").trim();
    execute({
      freeShippingThresholdPln: freeShippingEnabled ? Math.round(threshold * 100) : null,
      productMetaSuffixPl: metaSuffix || null,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-4 rounded-2xl bg-card p-5 shadow-card"
    >
      <h2 className="font-semibold">Dostawa</h2>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={freeShippingEnabled}
          onChange={(e) => setFreeShippingEnabled(e.target.checked)}
        />
        Darmowa dostawa od progu
      </label>

      {freeShippingEnabled && (
        <div>
          <label
            htmlFor="freeShippingThreshold"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Próg darmowej dostawy (zł)
          </label>
          <input
            id="freeShippingThreshold"
            name="freeShippingThreshold"
            type="number"
            step="0.01"
            min={0}
            required
            defaultValue={((settings.freeShippingThresholdPln ?? 20000) / 100).toFixed(2)}
            className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Liczony od wartości produktów po rabatach, bez kosztu dostawy. Dotyczy wszystkich metod
            dostawy. Kwota pojawia się w nagłówku sklepu, w koszyku i na stronie „Dostawa”.
          </p>
        </div>
      )}

      <h2 className="pt-2 font-semibold">SEO</h2>
      <div>
        <label
          htmlFor="productMetaSuffix"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          Dopisek do opisu produktów w Google
        </label>
        <input
          id="productMetaSuffix"
          name="productMetaSuffix"
          type="text"
          maxLength={40}
          defaultValue={settings.productMetaSuffixPl ?? ""}
          placeholder="np. Wysyłka w 24–48 h."
          className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Dodawany na końcu opisu każdego produktu w wynikach wyszukiwania (meta description). Puste
          pole — bez dopisku.
        </p>
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
