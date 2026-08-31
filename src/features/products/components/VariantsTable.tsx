"use client";

import type { ProductVariant } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteVariant, saveVariant } from "../actions";

type SerializedVariant = Omit<ProductVariant, "vatRate"> & { vatRate: number };

interface Props {
  productId: string;
  variants: SerializedVariant[];
}

const UNITS = ["kaps.", "tabl.", "g", "ml", "szt.", "saszetka", "ampułka"] as const;
type Unit = (typeof UNITS)[number];

function unitToLabel(unit: Unit | string): string {
  return unit === "g" || unit === "ml" ? "Gramatura" : "Pojemność";
}

function parseOptionValue(optionValue: string | null | undefined): { qty: string; unit: Unit } {
  if (!optionValue) return { qty: "", unit: "kaps." };
  const match = optionValue.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.+)$/);
  if (match) {
    const unit = match[2] as Unit;
    return { qty: match[1], unit: UNITS.includes(unit) ? unit : "kaps." };
  }
  return { qty: "", unit: "kaps." };
}

function plnToGrosze(value: string): number {
  return Math.round(parseFloat(value || "0") * 100);
}

function groszeToPln(grosze: number): string {
  return (grosze / 100).toFixed(2);
}

export function VariantsTable({ productId, variants }: Props) {
  const [editing, setEditing] = useState<SerializedVariant | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [deletingVariant, setDeletingVariant] = useState<SerializedVariant | null>(null);

  const { execute: execSave, isPending: saving } = useAction(saveVariant, {
    onSuccess: () => {
      setEditing(null);
      setShowNew(false);
    },
  });
  const { execute: execDelete, isPending: deleting } = useAction(deleteVariant, {
    onSuccess: () => setDeletingVariant(null),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const compareRaw = fd.get("comparePricePln") as string;
    const costRaw = fd.get("costPricePln") as string;
    const weightRaw = fd.get("weightGrams") as string;
    const lowStockRaw = fd.get("lowStockThreshold") as string;

    const qty = (fd.get("qty") as string).trim();
    const unit = fd.get("unit") as Unit;
    const optionValue = qty ? `${qty} ${unit}` : undefined;
    const optionLabel = optionValue ? unitToLabel(unit) : undefined;

    execSave({
      id: (fd.get("id") as string) || undefined,
      productId,
      sku: fd.get("sku") as string,
      ean: (fd.get("ean") as string) || undefined,
      optionLabel,
      optionValue,
      pricePln: plnToGrosze(fd.get("pricePln") as string),
      comparePricePln: compareRaw ? plnToGrosze(compareRaw) : undefined,
      costPricePln: costRaw ? plnToGrosze(costRaw) : undefined,
      stock: Number(fd.get("stock") || 0),
      vatRate: Number(fd.get("vatRate") || 5),
      weightGrams: weightRaw ? Number(weightRaw) : undefined,
      lowStockThreshold: lowStockRaw ? Number(lowStockRaw) : 5,
      trackStock: fd.get("trackStock") === "on",
      isDefault: fd.get("isDefault") === "on",
      isActive: fd.get("isActive") === "on",
    });
  }

  const variantForm = (item?: SerializedVariant) => {
    const parsed = parseOptionValue(item?.optionValue);
    return (
      <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-xl bg-muted p-3">
        {item && <input type="hidden" name="id" value={item.id} />}

        {/* Row 1: SKU, qty, unit */}
        <div className="grid grid-cols-3 gap-2">
          <input
            name="sku"
            defaultValue={item?.sku ?? ""}
            placeholder="SKU *"
            required
            className="rounded-lg border border-border px-2 py-1 text-sm"
          />
          <input
            name="qty"
            type="number"
            min={0.1}
            step={0.1}
            defaultValue={parsed.qty}
            placeholder="Ilość (np. 60)"
            className="rounded-lg border border-border px-2 py-1 text-sm"
          />
          <select
            name="unit"
            defaultValue={parsed.unit}
            className="rounded-lg border border-border px-2 py-1 text-sm"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: price, compare price, stock, VAT */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="mb-0.5 block text-xs text-muted-foreground">
              Cena (zł) *
              <input
                name="pricePln"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={item ? groszeToPln(item.pricePln) : ""}
                placeholder="49.90"
                required
                className="mt-0.5 w-full rounded-lg border border-border px-2 py-1 text-sm font-normal"
              />
            </label>
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-muted-foreground">
              Cena przed (zł)
              <input
                name="comparePricePln"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={item?.comparePricePln ? groszeToPln(item.comparePricePln) : ""}
                placeholder="59.90"
                className="mt-0.5 w-full rounded-lg border border-border px-2 py-1 text-sm font-normal"
              />
            </label>
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-muted-foreground">
              Stan magazynowy
              <input
                name="stock"
                type="number"
                min={0}
                defaultValue={item?.stock ?? 0}
                className="mt-0.5 w-full rounded-lg border border-border px-2 py-1 text-sm font-normal"
              />
            </label>
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-muted-foreground">
              VAT (%)
              <input
                name="vatRate"
                type="number"
                step="0.01"
                defaultValue={Number(item?.vatRate ?? 5)}
                className="mt-0.5 w-full rounded-lg border border-border px-2 py-1 text-sm font-normal"
              />
            </label>
          </div>
        </div>

        {/* Row 3: EAN, weight */}
        <div className="grid grid-cols-2 gap-2">
          <input
            name="ean"
            defaultValue={item?.ean ?? ""}
            placeholder="EAN / kod kreskowy"
            className="rounded-lg border border-border px-2 py-1 text-sm"
          />
          <div>
            <label className="mb-0.5 block text-xs text-muted-foreground">
              Waga [g]
              <input
                name="weightGrams"
                type="number"
                min={0.1}
                step={0.1}
                defaultValue={item?.weightGrams ?? ""}
                placeholder="150"
                className="mt-0.5 w-full rounded-lg border border-border px-2 py-1 text-sm font-normal"
              />
            </label>
          </div>
        </div>

        {/* Flags */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="isDefault" defaultChecked={item?.isDefault} />
            Domyślny
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={item?.isActive ?? true} />
            Aktywny
          </label>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showAdvanced ? "▲ Ukryj zaawansowane" : "▾ Zaawansowane"}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-3 gap-2 border-t border-border pt-2">
            <div>
              <label className="mb-0.5 block text-xs text-muted-foreground">
                Cena zakupu (zł)
                <input
                  name="costPricePln"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={item?.costPricePln ? groszeToPln(item.costPricePln) : ""}
                  placeholder="25.00"
                  className="mt-0.5 w-full rounded-lg border border-border px-2 py-1 text-sm font-normal"
                />
              </label>
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-muted-foreground">
                Alert stanu (szt.)
                <input
                  name="lowStockThreshold"
                  type="number"
                  min={0}
                  defaultValue={item?.lowStockThreshold ?? 5}
                  className="mt-0.5 w-full rounded-lg border border-border px-2 py-1 text-sm font-normal"
                />
              </label>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="trackStock"
                  defaultChecked={item?.trackStock ?? true}
                />
                Śledź stan
              </label>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
          >
            {saving ? "…" : "Zapisz"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowNew(false);
            }}
            className="rounded-lg border border-border px-3 py-1 text-xs"
          >
            Anuluj
          </button>
        </div>
      </form>
    );
  };

  return (
    <section className="rounded-2xl bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Warianty</h2>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        >
          + Dodaj wariant
        </button>
      </div>
      {showNew && !editing && variantForm()}
      <div className="divide-y">
        {variants.map((v) => (
          <div key={v.id}>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">
                  {v.sku}
                  {v.optionValue && (
                    <span className="ml-2 text-muted-foreground">— {v.optionValue}</span>
                  )}
                  {v.ean && (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{v.ean}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(v.pricePln / 100).toLocaleString("pl-PL", {
                    style: "currency",
                    currency: "PLN",
                  })}
                  {v.comparePricePln && (
                    <span className="ml-1 line-through">
                      {(v.comparePricePln / 100).toLocaleString("pl-PL", {
                        style: "currency",
                        currency: "PLN",
                      })}
                    </span>
                  )}{" "}
                  · stock: {v.stock}
                  {v.isDefault && " · domyślny"}
                  {!v.isActive && " · nieaktywny"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(v)}
                  className="rounded-lg border border-border px-2 py-1 text-xs"
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingVariant(v)}
                  className="rounded-lg border border-destructive px-2 py-1 text-xs text-destructive disabled:opacity-50"
                >
                  Usuń
                </button>
              </div>
            </div>
            {editing?.id === v.id && variantForm(v)}
          </div>
        ))}
        {variants.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">Brak wariantów</p>
        )}
      </div>

      <ConfirmDialog
        open={deletingVariant !== null}
        onOpenChange={(open) => !open && setDeletingVariant(null)}
        title="Usuń wariant"
        description={`Czy na pewno chcesz usunąć wariant „${deletingVariant?.sku}"? Tej operacji nie można cofnąć.`}
        pending={deleting}
        onConfirm={() => deletingVariant && execDelete({ id: deletingVariant.id })}
      />
    </section>
  );
}
