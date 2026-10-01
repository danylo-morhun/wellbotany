"use client";

import type { GiftSet, ProductStatus } from "@prisma/client";
import { Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";
import { FormSheet } from "@/features/admin/components/FormSheet";
import {
  Field,
  Segmented,
  Switch,
  TextArea,
  TextInput,
} from "@/features/products/components/editor/fields";
import { ImageUrlInput } from "@/features/products/components/editor/ImageUrlInput";
import { formatPrice } from "@/lib/format";
import { slugify } from "@/lib/slugify";
import { deleteGiftSet, saveGiftSet } from "../actions";
import { VariantSearchPicker } from "./VariantSearchPicker";

const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywny",
  ARCHIVED: "Archiwum",
};
const STATUS_TONE = { ACTIVE: "success", DRAFT: "warning", ARCHIVED: "neutral" } as const;

/** "12,50" / "12.50" → 1250; null when empty or not a positive amount */
function toGrosz(value: string): number | null {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return value.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

const zl = (grosz: number | null) =>
  grosz == null ? "" : (grosz / 100).toFixed(2).replace(".", ",");

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

type FormItem = Omit<GiftSetItemWithLabel, "id">;

type Props = {
  giftSets: GiftSetWithItems[];
};

export function GiftSetsAdmin({ giftSets }: Props) {
  const [editing, setEditing] = useState<GiftSetWithItems | "new" | null>(null);
  const [deletingSet, setDeletingSet] = useState<GiftSetWithItems | null>(null);

  const { execute: execDelete, isPending: deleting } = useAction(deleteGiftSet, {
    onSuccess: () => setDeletingSet(null),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania zestawu"),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Zestawy prezentowe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gotowe zestawy w sklepie. Kreator własnego zestawu konfigurujesz osobno.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/zestawy-prezentowe/opakowania"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Opakowania
          </Link>
          <Link
            href="/admin/zestawy-prezentowe/ustawienia"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Ustawienia kreatora
          </Link>
          <Button size="lg" onClick={() => setEditing("new")}>
            + Dodaj zestaw
          </Button>
        </div>
      </div>
      <div className="divide-y divide-border rounded-2xl bg-card shadow-card">
        {giftSets.map((gs) => (
          <div key={gs.id} className="flex items-center gap-3 px-4 py-3">
            {gs.imageUrl ? (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                <Image src={gs.imageUrl} alt="" fill className="object-contain p-1" sizes="40px" />
              </div>
            ) : (
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground"
                aria-hidden
              >
                {gs.namePl.charAt(0)}
              </div>
            )}
            <button
              type="button"
              onClick={() => setEditing(gs)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-medium hover:underline">{gs.namePl}</p>
              <p className="truncate text-xs text-muted-foreground">
                {gs.items.length} {gs.items.length === 1 ? "produkt" : "produktów"} ·{" "}
                {formatPrice(gs.pricePln)}
                {gs.isFeatured && " · wyróżniony"}
              </p>
            </button>
            <Badge tone={STATUS_TONE[gs.status]} dot>
              {STATUS_LABELS[gs.status]}
            </Badge>
            <RowActions
              label={gs.namePl}
              onEdit={() => setEditing(gs)}
              onDelete={() => setDeletingSet(gs)}
            />
          </div>
        ))}
        {giftSets.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Brak zestawów prezentowych
          </p>
        )}
      </div>

      {editing && (
        <GiftSetSheet
          key={editing === "new" ? "new" : editing.id}
          giftSet={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

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

function GiftSetSheet({
  giftSet,
  onClose,
}: {
  giftSet: GiftSetWithItems | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(giftSet?.namePl ?? "");
  const [slug, setSlug] = useState(giftSet?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!giftSet);
  const [status, setStatus] = useState<ProductStatus>(giftSet?.status ?? "DRAFT");
  const [imageUrl, setImageUrl] = useState(giftSet?.imageUrl ?? "");
  const [isFeatured, setIsFeatured] = useState(giftSet?.isFeatured ?? false);
  const [items, setItems] = useState<FormItem[]>(
    giftSet?.items.map(({ id: _id, ...i }) => i) ?? [],
  );
  const [price, setPrice] = useState(zl(giftSet?.pricePln ?? null));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { execute, isPending } = useAction(saveGiftSet, {
    onSuccess: () => {
      toast.success(giftSet ? "Zestaw zapisany" : "Zestaw dodany");
      onClose();
    },
    onError: ({ error }) => {
      const fieldErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(error.validationErrors ?? {})) {
        const msg = (v as { _errors?: string[] })?._errors?.[0];
        if (msg) fieldErrors[k] = msg;
      }
      setErrors(fieldErrors);
      if (error.serverError || !Object.keys(fieldErrors).length)
        toast.error(error.serverError ?? "Błąd zapisu zestawu");
    },
  });

  // Drop a field's error as soon as it's edited, so the hint (sum, saving) shows again
  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });

  const componentsSum = items.reduce((sum, i) => sum + i.pricePln * i.quantity, 0);
  const priceGrosz = toGrosz(price);
  const saving = priceGrosz && componentsSum > priceGrosz ? componentsSum - priceGrosz : 0;

  function setQty(variantId: string, quantity: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId ? { ...i, quantity: Math.min(99, Math.max(1, quantity)) } : i,
      ),
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (priceGrosz === null) next.pricePln = "Podaj cenę zestawu, np. 89,90";
    const compareRaw = String(fd.get("comparePrice") ?? "");
    const compare = toGrosz(compareRaw);
    if (compareRaw.trim() && compare === null) next.comparePricePln = "Nieprawidłowa kwota";
    if (items.length === 0) next.items = "Dodaj co najmniej 1 produkt";
    setErrors(next);
    if (Object.keys(next).length || priceGrosz === null) return;
    execute({
      id: giftSet?.id,
      slug,
      status,
      namePl: name,
      // Not editable here — the action nulls whatever is left out
      nameEn: giftSet?.nameEn ?? undefined,
      nameUk: giftSet?.nameUk ?? undefined,
      descriptionPl: String(fd.get("descriptionPl") ?? "").trim() || undefined,
      imageUrl: imageUrl || undefined,
      pricePln: priceGrosz,
      comparePricePln: compare ?? undefined,
      isFeatured,
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    });
  }

  return (
    <FormSheet
      wide
      title={giftSet ? `Edytuj ${giftSet.namePl}` : "Nowy zestaw prezentowy"}
      onClose={onClose}
      onSubmit={submit}
      pending={isPending}
      submitLabel={giftSet ? "Zapisz zestaw" : "Dodaj zestaw"}
    >
      <Segmented
        label="Status zestawu"
        value={status}
        onChange={setStatus}
        options={[
          { value: "ACTIVE", label: "Aktywny", dot: "bg-success" },
          { value: "DRAFT", label: "Szkic", dot: "bg-warning" },
          { value: "ARCHIVED", label: "Archiwum", dot: "bg-muted-foreground" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nazwa" htmlFor="gs-name" error={errors.namePl}>
          <TextInput
            id="gs-name"
            required
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugManual) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field
          label="Slug"
          htmlFor="gs-slug"
          error={errors.slug}
          hint={slugManual ? undefined : "Generowany z nazwy"}
        >
          <TextInput
            id="gs-slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManual(true);
            }}
            className="font-mono"
          />
        </Field>
      </div>
      <Field label="Opis" htmlFor="gs-desc">
        <TextArea id="gs-desc" name="descriptionPl" defaultValue={giftSet?.descriptionPl ?? ""} />
      </Field>

      <Field label="Produkty w zestawie" error={errors.items}>
        <VariantSearchPicker
          excludeIds={items.map((i) => i.variantId)}
          onPick={(v) => {
            clearError("items");
            setItems((prev) => [
              ...prev,
              {
                variantId: v.id,
                quantity: 1,
                productName: v.productName,
                optionValue: v.optionValue,
                pricePln: v.pricePln,
              },
            ]);
          }}
        />
        {items.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {items.map((i) => (
              <li key={i.variantId} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{i.productName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {i.optionValue && `${i.optionValue} · `}
                    {formatPrice(i.pricePln)}
                  </span>
                </span>
                <div className="flex items-center rounded-lg border border-border">
                  <QtyBtn
                    label="Mniej"
                    disabled={i.quantity <= 1}
                    onClick={() => setQty(i.variantId, i.quantity - 1)}
                  >
                    <Minus />
                  </QtyBtn>
                  <span className="w-7 text-center text-sm tabular-nums">{i.quantity}</span>
                  <QtyBtn label="Więcej" onClick={() => setQty(i.variantId, i.quantity + 1)}>
                    <Plus />
                  </QtyBtn>
                </div>
                <QtyBtn
                  label={`Usuń ${i.productName}`}
                  onClick={() =>
                    setItems((prev) => prev.filter((x) => x.variantId !== i.variantId))
                  }
                >
                  <X />
                </QtyBtn>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Cena zestawu"
          htmlFor="gs-price"
          error={errors.pricePln}
          hint={
            items.length > 0
              ? `Suma produktów: ${formatPrice(componentsSum)}${saving ? ` · klient oszczędza ${formatPrice(saving)}` : ""}`
              : undefined
          }
        >
          <MoneyInput
            id="gs-price"
            value={price}
            onChange={(e) => {
              clearError("pricePln");
              setPrice(e.target.value);
            }}
          />
        </Field>
        <Field
          label="Cena przekreślona"
          htmlFor="gs-compare"
          error={errors.comparePricePln}
          hint="Opcjonalnie"
        >
          <MoneyInput
            id="gs-compare"
            name="comparePrice"
            onChange={() => clearError("comparePricePln")}
            defaultValue={zl(giftSet?.comparePricePln ?? null)}
          />
        </Field>
      </div>

      <Field label="Zdjęcie" error={errors.imageUrl}>
        <ImageUrlInput value={imageUrl} onChange={setImageUrl} alt="Zdjęcie zestawu" />
      </Field>
      <Switch
        label="Wyróżniony"
        description="Pokazywany na górze listy zestawów"
        checked={isFeatured}
        onChange={setIsFeatured}
      />
    </FormSheet>
  );
}

function MoneyInput(props: React.ComponentProps<"input">) {
  return (
    <div className="relative">
      <TextInput inputMode="decimal" placeholder="0,00" {...props} className="pr-9" />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
        zł
      </span>
    </div>
  );
}

function QtyBtn({
  label,
  children,
  ...props
}: { label: string; children: React.ReactNode } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 [&_svg]:size-3.5"
      {...props}
    >
      {children}
    </button>
  );
}
