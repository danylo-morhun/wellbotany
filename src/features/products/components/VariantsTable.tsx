"use client";

import type { ProductVariant } from "@prisma/client";
import { MoreHorizontal, Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteVariant, saveVariant } from "../actions";
import { Field, inputClass, Switch, TextInput } from "./editor/fields";

type SerializedVariant = Omit<ProductVariant, "vatRate"> & { vatRate: number };

interface Props {
  productId: string;
  variants: SerializedVariant[];
}

const UNITS = ["kaps.", "tabl.", "g", "ml", "szt.", "saszetka", "ampułka", "żelek"] as const;
type Unit = (typeof UNITS)[number];
const VAT_RATES = [5, 8, 23];

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

// Accepts "49,90" as well as "49.90"
function plnToGrosze(value: string): number {
  return Math.round(parseFloat((value || "0").replace(",", ".")) * 100);
}

function groszeToPln(grosze: number): string {
  return (grosze / 100).toFixed(2).replace(".", ",");
}

/** EAN-13 / EAN-8 / UPC-A check digit */
function isValidEan(raw: string): boolean {
  // UPC-A is an EAN-13 with a leading zero
  const ean = raw.length === 12 ? `0${raw}` : raw;
  if (!/^\d{8}$|^\d{13}$/.test(ean)) return false;
  const digits = ean.split("").map(Number);
  const check = digits.pop() as number;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function VariantsTable({ productId, variants }: Props) {
  const [editing, setEditing] = useState<SerializedVariant | "new" | null>(null);
  const [deletingVariant, setDeletingVariant] = useState<SerializedVariant | null>(null);

  const { execute: execDelete, isPending: deleting } = useAction(deleteVariant, {
    onSuccess: () => {
      toast.success("Wariant usunięty");
      setDeletingVariant(null);
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania wariantu"),
  });

  return (
    <section className="rounded-2xl bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-semibold">Warianty, ceny i stany</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Każdy wariant to osobny SKU z własną ceną, EAN i stanem.
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditing("new")}>
          <Plus aria-hidden />
          Dodaj wariant
        </Button>
      </div>

      {variants.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Brak wariantów — produkt nie może zostać kupiony.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-border text-left text-xs text-muted-foreground">
              <tr>
                <th className="h-9 pl-5 font-medium">Wariant</th>
                <th className="h-9 px-3 font-medium">EAN</th>
                <th className="h-9 px-3 text-right font-medium">Cena</th>
                <th className="h-9 px-3 text-right font-medium">Stan</th>
                <th className="h-9 w-12 pr-3" />
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const low = v.trackStock && v.stock <= v.lowStockThreshold;
                const eanOk = v.ean ? isValidEan(v.ean) : false;
                return (
                  <tr
                    key={v.id}
                    onClick={(e) => {
                      // Menu items render in a portal but their clicks still bubble here
                      // through React — only react to clicks physically inside the row
                      const target = e.target as HTMLElement;
                      if (!e.currentTarget.contains(target) || target.closest("button")) return;
                      setEditing(v);
                    }}
                    className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-muted/40"
                  >
                    <td className="py-3 pl-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{v.optionValue ?? "Standardowy"}</span>
                        {v.isDefault && <Badge tone="primary">domyślny</Badge>}
                        {!v.isActive && <Badge>nieaktywny</Badge>}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{v.sku}</p>
                    </td>
                    <td className="px-3 py-3">
                      {v.ean ? (
                        <span
                          className={cn("font-mono text-xs", !eanOk && "text-destructive")}
                          title={eanOk ? undefined : "Nieprawidłowa suma kontrolna EAN"}
                        >
                          {v.ean}
                        </span>
                      ) : (
                        <Badge tone="warning">brak</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <p className="font-medium">{formatPrice(v.pricePln)}</p>
                      {v.comparePricePln && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(v.comparePricePln)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {v.trackStock ? (
                        <span className={cn(low && "font-semibold text-destructive")}>
                          {v.stock} szt.
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Akcje dla ${v.sku}`}
                          className="flex size-8 items-center justify-center rounded-lg hover:bg-muted aria-expanded:bg-muted"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setEditing(v)}>Edytuj</DropdownMenuItem>
                          <DropdownMenuItem destructive onClick={() => setDeletingVariant(v)}>
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

      {editing && (
        <VariantSheet
          key={editing === "new" ? "new" : editing.id}
          productId={productId}
          variant={editing === "new" ? null : editing}
          isFirst={variants.length === 0}
          onClose={() => setEditing(null)}
        />
      )}

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

function VariantSheet({
  productId,
  variant,
  isFirst,
  onClose,
}: {
  productId: string;
  variant: SerializedVariant | null;
  isFirst: boolean;
  onClose: () => void;
}) {
  const parsed = parseOptionValue(variant?.optionValue);
  const [qty, setQty] = useState(parsed.qty);
  const [unit, setUnit] = useState<Unit>(parsed.unit);
  const [sku, setSku] = useState(variant?.sku ?? "");
  const [ean, setEan] = useState(variant?.ean ?? "");
  const [price, setPrice] = useState(variant ? groszeToPln(variant.pricePln) : "");
  const [compare, setCompare] = useState(
    variant?.comparePricePln ? groszeToPln(variant.comparePricePln) : "",
  );
  const [cost, setCost] = useState(variant?.costPricePln ? groszeToPln(variant.costPricePln) : "");
  const [stock, setStock] = useState(String(variant?.stock ?? 0));
  const [vat, setVat] = useState(String(variant?.vatRate ?? 5));
  const [weight, setWeight] = useState(variant?.weightGrams?.toString() ?? "");
  const [lowStock, setLowStock] = useState(String(variant?.lowStockThreshold ?? 5));
  const [trackStock, setTrackStock] = useState(variant?.trackStock ?? true);
  const [isDefault, setIsDefault] = useState(variant?.isDefault ?? isFirst);
  const [isActive, setIsActive] = useState(variant?.isActive ?? true);

  const { execute, isPending } = useAction(saveVariant, {
    onSuccess: () => {
      toast.success(variant ? "Wariant zapisany" : "Wariant dodany");
      onClose();
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu wariantu"),
  });

  const priceGr = plnToGrosze(price);
  const compareGr = compare ? plnToGrosze(compare) : null;
  const costGr = cost ? plnToGrosze(cost) : null;
  const margin = costGr && priceGr ? Math.round(((priceGr - costGr) / priceGr) * 100) : null;
  const lowest = variant?.lowestPrice30dPln ?? null;
  const eanWarning =
    ean && !isValidEan(ean) ? "Sprawdź kod — nie zgadza się suma kontrolna EAN." : undefined;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const optionValue = qty.trim() ? `${qty.trim()} ${unit}` : undefined;
    execute({
      id: variant?.id,
      productId,
      sku: sku.trim(),
      ean: ean.trim() || undefined,
      optionLabel: optionValue ? unitToLabel(unit) : undefined,
      optionValue,
      pricePln: priceGr,
      comparePricePln: compareGr ?? undefined,
      costPricePln: costGr ?? undefined,
      stock: Number(stock || 0),
      vatRate: Number(vat || 5),
      weightGrams: weight ? Number(weight) : undefined,
      lowStockThreshold: lowStock ? Number(lowStock) : 5,
      trackStock,
      isDefault,
      isActive,
    });
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <form onSubmit={submit} className="flex min-h-full flex-col">
          <div className="border-b border-border px-6 py-4">
            <SheetTitle className="text-lg font-semibold">
              {variant ? `Wariant ${variant.optionValue ?? variant.sku}` : "Nowy wariant"}
            </SheetTitle>
          </div>
          <div className="flex-1 space-y-5 px-6 py-5">
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <Field label="Wielkość opakowania" htmlFor="v-qty">
                <TextInput
                  id="v-qty"
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="60"
                />
              </Field>
              <Field label="Jednostka" htmlFor="v-unit">
                <select
                  id="v-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as Unit)}
                  className={`${inputClass} h-9`}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="SKU" htmlFor="v-sku">
                <TextInput
                  id="v-sku"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="font-mono"
                />
              </Field>
              <Field label="EAN" htmlFor="v-ean" error={eanWarning}>
                <TextInput
                  id="v-ean"
                  inputMode="numeric"
                  value={ean}
                  aria-invalid={!!eanWarning}
                  onChange={(e) => setEan(e.target.value.replace(/\D/g, ""))}
                  className="font-mono"
                />
              </Field>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <p className="mb-3 text-sm font-semibold">Cena</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cena sprzedaży" htmlFor="v-price">
                  <MoneyInput id="v-price" required value={price} onChange={setPrice} />
                </Field>
                <Field label="Cena przekreślona" htmlFor="v-compare">
                  <MoneyInput id="v-compare" value={compare} onChange={setCompare} />
                </Field>
              </div>
              {compareGr && lowest != null && compareGr !== lowest && (
                <p className="mt-2 rounded-lg bg-warning/20 px-3 py-2 text-xs">
                  Omnibus: jako cenę „przed obniżką” pokazuj najniższą z ostatnich 30 dni —{" "}
                  <button
                    type="button"
                    onClick={() => setCompare(groszeToPln(lowest))}
                    className="font-semibold underline underline-offset-2"
                  >
                    {formatPrice(lowest)}
                  </button>
                  .
                </p>
              )}
              {compareGr != null && compareGr <= priceGr && (
                <p className="mt-2 text-xs text-destructive">
                  Cena przekreślona powinna być wyższa od ceny sprzedaży.
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field
                  label="Cena zakupu"
                  htmlFor="v-cost"
                  hint={margin != null ? `Marża ${margin}%` : "Widoczna tylko w panelu."}
                >
                  <MoneyInput id="v-cost" value={cost} onChange={setCost} />
                </Field>
                <Field label="VAT" htmlFor="v-vat">
                  <select
                    id="v-vat"
                    value={vat}
                    onChange={(e) => setVat(e.target.value)}
                    className={`${inputClass} h-9`}
                  >
                    {[...new Set([...VAT_RATES, Number(vat)])].map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="rounded-xl bg-muted/50 p-4">
              <p className="mb-2 text-sm font-semibold">Magazyn i wysyłka</p>
              <Switch label="Śledź stan magazynowy" checked={trackStock} onChange={setTrackStock} />
              <div className="mt-2 grid grid-cols-3 gap-3">
                <Field label="Stan" htmlFor="v-stock">
                  <TextInput
                    id="v-stock"
                    type="number"
                    min={0}
                    disabled={!trackStock}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </Field>
                <Field label="Alert poniżej" htmlFor="v-low">
                  <TextInput
                    id="v-low"
                    type="number"
                    min={0}
                    disabled={!trackStock}
                    value={lowStock}
                    onChange={(e) => setLowStock(e.target.value)}
                  />
                </Field>
                <Field label="Waga [g]" htmlFor="v-weight">
                  <TextInput
                    id="v-weight"
                    type="number"
                    min={0}
                    step={0.1}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <div className="divide-y divide-border/70">
              <Switch
                label="Wariant domyślny"
                description="Wybrany na karcie produktu i używany w listingach"
                checked={isDefault}
                onChange={setIsDefault}
              />
              <Switch
                label="Aktywny"
                description="Nieaktywny wariant nie jest dostępny do zakupu"
                checked={isActive}
                onChange={setIsActive}
              />
            </div>
          </div>
          <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background px-6 py-4">
            <Button type="submit" size="lg" disabled={isPending}>
              {isPending ? "Zapisywanie…" : "Zapisz wariant"}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={onClose}>
              Anuluj
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function MoneyInput({
  id,
  value,
  onChange,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <TextInput
        id={id}
        inputMode="decimal"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ""))}
        placeholder="0,00"
        className="pr-9 tabular-nums"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
        zł
      </span>
    </div>
  );
}
