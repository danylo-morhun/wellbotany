"use client";

import type { GiftSet, ProductStatus } from "@prisma/client";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CloudinaryDropzone } from "@/components/ui/cloudinary-dropzone";
import { formatPrice } from "@/lib/format";
import { slugify } from "@/lib/slugify";
import { deleteGiftSet, saveGiftSet } from "../actions";
import { VariantSearchPicker } from "./VariantSearchPicker";

const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywny",
  ARCHIVED: "Zarchiwizowany",
};

function plnToGrosze(value: string): number {
  return Math.round(Number.parseFloat(value || "0") * 100);
}

function groszeToPln(grosze: number): string {
  return (grosze / 100).toFixed(2);
}

export type GiftSetItemWithLabel = {
  id: string;
  variantId: string;
  quantity: number;
  productName: string;
  optionValue: string | null;
  pricePln: number;
};

export type GiftSetWithItems = GiftSet & {
  items: GiftSetItemWithLabel[];
};

type FormItem = {
  variantId: string;
  quantity: number;
  productName: string;
  optionValue: string | null;
  pricePln: number;
};

type Props = {
  giftSets: GiftSetWithItems[];
};

export function GiftSetsAdmin({ giftSets }: Props) {
  const [editing, setEditing] = useState<GiftSetWithItems | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [imageUrl, setImageUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [items, setItems] = useState<FormItem[]>([]);
  const [deletingSet, setDeletingSet] = useState<GiftSetWithItems | null>(null);

  const { execute: execSave, isPending: saving } = useAction(saveGiftSet, {
    onSuccess: () => {
      setEditing(null);
      setShowNew(false);
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu zestawu"),
  });
  const { execute: execDelete, isPending: deleting } = useAction(deleteGiftSet, {
    onSuccess: () => setDeletingSet(null),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania zestawu"),
  });

  function resetForm() {
    setName("");
    setSlug("");
    setSlugManual(false);
    setStatus("DRAFT");
    setImageUrl("");
    setIsFeatured(false);
    setItems([]);
  }

  function startNew() {
    setEditing(null);
    resetForm();
    setShowNew(true);
  }

  function startEditing(gs: GiftSetWithItems) {
    setShowNew(false);
    setName(gs.namePl);
    setSlug(gs.slug);
    setSlugManual(true);
    setStatus(gs.status);
    setImageUrl(gs.imageUrl ?? "");
    setIsFeatured(gs.isFeatured);
    setItems(
      gs.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        productName: i.productName,
        optionValue: i.optionValue,
        pricePln: i.pricePln,
      })),
    );
    setEditing(gs);
  }

  function cancelForm() {
    setEditing(null);
    setShowNew(false);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) setSlug(slugify(value));
  }

  function addVariant(picked: {
    id: string;
    productName: string;
    optionValue: string | null;
    pricePln: number;
  }) {
    if (items.some((i) => i.variantId === picked.id)) return;
    setItems((prev) => [
      ...prev,
      {
        variantId: picked.id,
        quantity: 1,
        productName: picked.productName,
        optionValue: picked.optionValue,
        pricePln: picked.pricePln,
      },
    ]);
  }

  function updateItemQuantity(variantId: string, quantity: number) {
    setItems((prev) => prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)));
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  const componentsSumPln = items.reduce((sum, i) => sum + i.pricePln * i.quantity, 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    execSave({
      id: (fd.get("id") as string) || undefined,
      slug,
      status,
      namePl: name,
      descriptionPl: (fd.get("descriptionPl") as string) || undefined,
      imageUrl: imageUrl || undefined,
      pricePln: plnToGrosze(fd.get("pricePln") as string),
      comparePricePln: (() => {
        const raw = fd.get("comparePricePln") as string;
        return raw ? plnToGrosze(raw) : undefined;
      })(),
      isFeatured,
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    });
  }

  const form = (item?: GiftSetWithItems) => (
    <form
      onSubmit={handleSubmit}
      className="mt-2 mb-4 grid gap-3 rounded-2xl bg-card p-4 shadow-card"
    >
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Nazwa zestawu *"
          required
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <input
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugManual(true);
          }}
          placeholder="Slug *"
          required
          className="rounded-lg border border-border px-2 py-1 font-mono text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProductStatus)}
          className="rounded-lg border border-border px-2 py-1 text-sm"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          Wyróżniony
        </label>
        <input
          name="pricePln"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item ? groszeToPln(item.pricePln) : ""}
          placeholder="Cena zestawu (PLN) *"
          required
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <input
          name="comparePricePln"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item?.comparePricePln ? groszeToPln(item.comparePricePln) : ""}
          placeholder="Cena porównawcza (PLN)"
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <textarea
          name="descriptionPl"
          defaultValue={item?.descriptionPl ?? ""}
          placeholder="Opis"
          rows={2}
          className="col-span-2 rounded-lg border border-border px-2 py-1 text-sm"
        />
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Zdjęcie zestawu</p>
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              <Image src={imageUrl} alt="" fill className="object-contain p-1" sizes="56px" />
            </div>
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground">
              brak
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            <CloudinaryDropzone variant="button" multiple={false} onUploaded={setImageUrl} />
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="lub wklej URL zdjęcia…"
              className="flex-1 rounded-lg border border-border px-2 py-1 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Produkty w zestawie</p>
        <VariantSearchPicker excludeIds={items.map((i) => i.variantId)} onPick={addVariant} />

        {items.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {items.map((i) => (
              <li key={i.variantId} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">
                  {i.productName}
                  {i.optionValue ? ` — ${i.optionValue}` : ""}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={i.quantity}
                    onChange={(e) =>
                      updateItemQuantity(i.variantId, Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-14 rounded-lg border border-border px-1.5 py-0.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i.variantId)}
                    className="text-destructive"
                  >
                    Usuń
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Suma cen produktów: {formatPrice(componentsSumPln)}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || items.length === 0}
          className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
        >
          {saving ? "…" : "Zapisz"}
        </button>
        <button
          type="button"
          onClick={cancelForm}
          className="rounded-lg border border-border px-3 py-1 text-xs"
        >
          Anuluj
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Zestawy prezentowe</h1>
        <button
          type="button"
          onClick={startNew}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        >
          + Dodaj zestaw
        </button>
      </div>
      {showNew && !editing && form()}
      <div className="divide-y divide-border rounded-2xl bg-card shadow-card">
        {giftSets.map((gs) => (
          <div key={gs.id}>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {gs.imageUrl ? (
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <Image
                      src={gs.imageUrl}
                      alt={gs.namePl}
                      fill
                      className="object-contain p-1"
                      sizes="40px"
                    />
                  </div>
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                    {gs.namePl.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{gs.namePl}</p>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_LABELS[gs.status]} · {gs.items.length} produktów ·{" "}
                    {formatPrice(gs.pricePln)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(gs)}
                  className="rounded-lg border border-border px-2 py-1 text-xs"
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingSet(gs)}
                  className="rounded-lg border border-border border-destructive px-2 py-1 text-xs text-destructive disabled:opacity-50"
                >
                  Usuń
                </button>
              </div>
            </div>
            {editing?.id === gs.id && form(gs)}
          </div>
        ))}
        {giftSets.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Brak zestawów prezentowych
          </p>
        )}
      </div>

      <ConfirmDialog
        open={deletingSet !== null}
        onOpenChange={(open) => !open && setDeletingSet(null)}
        title="Usuń zestaw"
        description={`Czy na pewno chcesz usunąć zestaw „${deletingSet?.namePl}"? Tej operacji nie można cofnąć.`}
        pending={deleting}
        onConfirm={() => deletingSet && execDelete({ id: deletingSet.id })}
      />
    </div>
  );
}
