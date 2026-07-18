"use client";

import type { GiftBuilderSettings } from "@prisma/client";
import { Check, Gift } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { addCustomGiftSetToCart } from "../actions";
import { allocateGiftBoxPrice, giftBuilderTargetTotalPln } from "../lib/pricing";

export type GiftPoolItem = {
  variantId: string;
  productName: string;
  optionValue: string | null;
  pricePln: number;
  stock: number;
  imageUrl: string | null;
};

export type GiftPackagingOption = {
  id: string;
  namePl: string;
  extraPricePln: number;
  imageUrl: string | null;
};

const MESSAGE_MAX_LENGTH = 200;

type Props = {
  settings: Pick<
    GiftBuilderSettings,
    "namePl" | "pricingMode" | "boxPricePln" | "minItems" | "maxItems"
  >;
  pool: GiftPoolItem[];
  packagings: GiftPackagingOption[];
};

export function GiftBuilder({ settings, pool, packagings }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [packagingId, setPackagingId] = useState(packagings[0]?.id ?? "");
  const [giftMessage, setGiftMessage] = useState("");

  const { execute, isExecuting } = useAction(addCustomGiftSetToCart, {
    onSuccess: () => {
      router.refresh();
      setSelectedIds([]);
      setGiftMessage("");
      toast.success("Zestaw dodany do koszyka", {
        duration: 4000,
        action: {
          label: "Otwórz koszyk →",
          onClick: () => window.dispatchEvent(new Event("cart:open")),
        },
      });
    },
    onError: ({ error }) => {
      toast.error("Błąd", { description: error.serverError ?? "Nie udało się dodać zestawu" });
    },
  });

  function toggle(variantId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(variantId)) return prev.filter((id) => id !== variantId);
      if (prev.length >= settings.maxItems) return prev;
      return [...prev, variantId];
    });
  }

  const components = useMemo(
    () =>
      selectedIds
        .map((id) => pool.find((p) => p.variantId === id))
        .filter((p): p is GiftPoolItem => p != null)
        .map((p) => ({ variantId: p.variantId, quantity: 1, unitPricePln: p.pricePln })),
    [selectedIds, pool],
  );

  const selectedPackaging = packagings.find((p) => p.id === packagingId);
  const target =
    giftBuilderTargetTotalPln(settings, components) + (selectedPackaging?.extraPricePln ?? 0);
  const { totalPln } = allocateGiftBoxPrice(components, target);

  const meetsMin = selectedIds.length >= settings.minItems;
  const atMax = selectedIds.length >= settings.maxItems;
  const canSubmit = meetsMin && packagingId !== "" && !isExecuting;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <div>
          <h2 className="mb-3 text-base font-semibold">1. Wybierz produkty</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {pool.map((item) => {
              const selected = selectedIds.includes(item.variantId);
              const outOfStock = item.stock <= 0;
              const disabled = outOfStock || (!selected && atMax);
              return (
                <button
                  key={item.variantId}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(item.variantId)}
                  className={`relative flex flex-col overflow-hidden rounded-2xl bg-card text-left shadow-card transition-[box-shadow,transform] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "ring-2 ring-primary"
                      : "hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:hover:translate-y-0"
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-white">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-contain p-4"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Brak zdjęcia
                      </div>
                    )}
                    {selected && (
                      <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </div>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <span className="rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-float">
                          Niedostępny
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
                      {item.productName}
                      {item.optionValue ? ` — ${item.optionValue}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatPrice(item.pricePln)}
                    </p>
                  </div>
                </button>
              );
            })}
            {pool.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                Brak produktów dostępnych do zestawu
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold">2. Wybierz opakowanie</h2>
          {packagings.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {packagings.map((p) => {
                const selected = p.id === packagingId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPackagingId(p.id)}
                    className={`flex flex-col overflow-hidden rounded-2xl bg-card text-left shadow-card transition-[box-shadow,transform] duration-200 ease-out ${
                      selected
                        ? "ring-2 ring-primary"
                        : "hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:hover:translate-y-0"
                    }`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-white">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt={p.namePl}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-contain p-4"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Brak zdjęcia
                        </div>
                      )}
                      {selected && (
                        <div className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold leading-snug text-foreground">
                        {p.namePl}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.extraPricePln > 0 ? `+${formatPrice(p.extraPricePln)}` : "Gratis"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Brak dostępnych opakowań — skontaktuj się z nami, aby dokończyć zamówienie.
            </p>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold">3. Dodaj wiadomość (opcjonalnie)</h2>
          <textarea
            value={giftMessage}
            onChange={(e) => setGiftMessage(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
            placeholder="Np. Wszystkiego najlepszego! Dbaj o siebie."
            rows={3}
            className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {giftMessage.length}/{MESSAGE_MAX_LENGTH}
          </p>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Gift className="size-4 text-primary" />
            <h2 className="text-base font-semibold">{settings.namePl}</h2>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Wybrano {selectedIds.length} / {settings.maxItems} produktów
            {!meetsMin && ` (min. ${settings.minItems})`}
          </p>
          {!selectedPackaging && packagings.length > 0 && (
            <p className="mt-1 text-sm text-destructive">Wybierz opakowanie</p>
          )}

          <div className="mt-4 flex justify-between border-t border-border pt-4 text-base">
            <span className="font-semibold">Razem</span>
            <span className="font-bold">{formatPrice(totalPln)}</span>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              execute({
                items: selectedIds.map((variantId) => ({ variantId, quantity: 1 })),
                packagingId,
                giftMessage: giftMessage.trim() || undefined,
              })
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            {isExecuting ? "Dodawanie…" : "Dodaj zestaw do koszyka"}
          </button>
        </div>
      </div>
    </div>
  );
}
