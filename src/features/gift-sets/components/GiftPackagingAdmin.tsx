"use client";

import type { GiftPackaging } from "@prisma/client";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";
import { FormSheet } from "@/features/admin/components/FormSheet";
import { Field, Switch, TextInput } from "@/features/products/components/editor/fields";
import { ImageUrlInput } from "@/features/products/components/editor/ImageUrlInput";
import { formatPrice } from "@/lib/format";
import { deleteGiftPackaging, saveGiftPackaging } from "../actions";

/** "12,50" / "12.50" → 1250; null when not a valid non-negative amount */
function toGrosz(value: string): number | null {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return value.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

const zl = (grosz: number) => (grosz / 100).toFixed(2).replace(".", ",");

type Props = { packagings: GiftPackaging[] };

export function GiftPackagingAdmin({ packagings }: Props) {
  const [editing, setEditing] = useState<GiftPackaging | "new" | null>(null);
  const [deletingPackaging, setDeletingPackaging] = useState<GiftPackaging | null>(null);

  const { execute: execDelete, isPending: deleting } = useAction(deleteGiftPackaging, {
    onSuccess: () => setDeletingPackaging(null),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania opakowania"),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Opakowania</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Do wyboru w kreatorze własnego zestawu — dopłata doliczana do koszyka
          </p>
        </div>
        <Button size="lg" onClick={() => setEditing("new")}>
          + Dodaj opakowanie
        </Button>
      </div>
      <div className="divide-y divide-border rounded-2xl bg-card shadow-card">
        {packagings.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3">
            {p.imageUrl ? (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                <Image src={p.imageUrl} alt="" fill className="object-contain p-1" sizes="40px" />
              </div>
            ) : (
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground"
                aria-hidden
              >
                {p.namePl.charAt(0)}
              </div>
            )}
            <button
              type="button"
              onClick={() => setEditing(p)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-medium hover:underline">{p.namePl}</p>
              <p className="text-xs text-muted-foreground">
                {p.extraPricePln > 0 ? `+${formatPrice(p.extraPricePln)}` : "Bez dopłaty"}
              </p>
            </button>
            {!p.isActive && <Badge>Nieaktywne</Badge>}
            <RowActions
              label={p.namePl}
              onEdit={() => setEditing(p)}
              onDelete={() => setDeletingPackaging(p)}
            />
          </div>
        ))}
        {packagings.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Brak opakowań</p>
        )}
      </div>

      {editing && (
        <PackagingSheet
          key={editing === "new" ? "new" : editing.id}
          packaging={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deletingPackaging !== null}
        onOpenChange={(open) => !open && setDeletingPackaging(null)}
        title="Usuń opakowanie"
        description={`Czy na pewno chcesz usunąć opakowanie „${deletingPackaging?.namePl}"? Złożone zamówienia zachowają jego nazwę. Tej operacji nie można cofnąć.`}
        pending={deleting}
        onConfirm={() => deletingPackaging && execDelete({ id: deletingPackaging.id })}
      />
    </div>
  );
}

function PackagingSheet({
  packaging,
  onClose,
}: {
  packaging: GiftPackaging | null;
  onClose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState(packaging?.imageUrl ?? "");
  const [isActive, setIsActive] = useState(packaging?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { execute, isPending } = useAction(saveGiftPackaging, {
    onSuccess: () => {
      toast.success(packaging ? "Opakowanie zapisane" : "Opakowanie dodane");
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
        toast.error(error.serverError ?? "Błąd zapisu opakowania");
    },
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const price = toGrosz(String(fd.get("extraPrice") ?? ""));
    if (price === null) {
      setErrors({ extraPricePln: "Podaj kwotę, np. 9,90 (0 = bez dopłaty)" });
      return;
    }
    setErrors({});
    execute({
      id: packaging?.id,
      namePl: String(fd.get("namePl") ?? "").trim(),
      imageUrl: imageUrl || undefined,
      extraPricePln: price,
      isActive,
      sortOrder: Number(fd.get("sortOrder") || 0),
    });
  }

  return (
    <FormSheet
      title={packaging ? `Edytuj ${packaging.namePl}` : "Nowe opakowanie"}
      onClose={onClose}
      onSubmit={submit}
      pending={isPending}
      submitLabel={packaging ? "Zapisz opakowanie" : "Dodaj opakowanie"}
    >
      <Field label="Nazwa" htmlFor="pk-name" error={errors.namePl}>
        <TextInput
          id="pk-name"
          name="namePl"
          required
          autoFocus
          defaultValue={packaging?.namePl ?? ""}
          placeholder="np. Pudełko kraft z kokardą"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dopłata" htmlFor="pk-price" error={errors.extraPricePln}>
          <div className="relative">
            <TextInput
              id="pk-price"
              name="extraPrice"
              inputMode="decimal"
              required
              defaultValue={packaging ? zl(packaging.extraPricePln) : "0,00"}
              className="pr-9"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              zł
            </span>
          </div>
        </Field>
        <Field label="Kolejność" htmlFor="pk-sort" hint="Mniejsza = wyżej">
          <TextInput
            id="pk-sort"
            name="sortOrder"
            type="number"
            defaultValue={packaging?.sortOrder ?? 0}
          />
        </Field>
      </div>
      <Field label="Zdjęcie" error={errors.imageUrl}>
        <ImageUrlInput value={imageUrl} onChange={setImageUrl} alt="Zdjęcie opakowania" />
      </Field>
      <Switch
        label="Aktywne"
        description="Nieaktywne nie jest widoczne w kreatorze zestawu"
        checked={isActive}
        onChange={setIsActive}
      />
    </FormSheet>
  );
}
