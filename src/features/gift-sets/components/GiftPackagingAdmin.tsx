"use client";

import type { GiftPackaging } from "@prisma/client";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CloudinaryDropzone } from "@/components/ui/cloudinary-dropzone";
import { formatPrice } from "@/lib/format";
import { deleteGiftPackaging, saveGiftPackaging } from "../actions";

function plnToGrosze(value: string): number {
  return Math.round(Number.parseFloat(value || "0") * 100);
}

function groszeToPln(grosze: number): string {
  return (grosze / 100).toFixed(2);
}

type Props = { packagings: GiftPackaging[] };

export function GiftPackagingAdmin({ packagings }: Props) {
  const [editing, setEditing] = useState<GiftPackaging | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [deletingPackaging, setDeletingPackaging] = useState<GiftPackaging | null>(null);

  const { execute: execSave, isPending: saving } = useAction(saveGiftPackaging, {
    onSuccess: () => {
      setEditing(null);
      setShowNew(false);
    },
  });
  const { execute: execDelete, isPending: deleting } = useAction(deleteGiftPackaging, {
    onSuccess: () => setDeletingPackaging(null),
  });

  function startNew() {
    setEditing(null);
    setImageUrl("");
    setIsActive(true);
    setShowNew(true);
  }

  function startEditing(p: GiftPackaging) {
    setShowNew(false);
    setImageUrl(p.imageUrl ?? "");
    setIsActive(p.isActive);
    setEditing(p);
  }

  function cancelForm() {
    setEditing(null);
    setShowNew(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    execSave({
      id: (fd.get("id") as string) || undefined,
      namePl: fd.get("namePl") as string,
      imageUrl: imageUrl || undefined,
      extraPricePln: plnToGrosze(fd.get("extraPricePln") as string),
      isActive,
      sortOrder: Number(fd.get("sortOrder") || 0),
    });
  }

  const form = (item?: GiftPackaging) => (
    <form
      onSubmit={handleSubmit}
      className="mt-2 mb-4 grid gap-3 rounded-2xl bg-card p-4 shadow-card"
    >
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid grid-cols-2 gap-2">
        <input
          name="namePl"
          defaultValue={item?.namePl ?? ""}
          placeholder="Nazwa opakowania *"
          required
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <input
          name="extraPricePln"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item ? groszeToPln(item.extraPricePln) : ""}
          placeholder="Dopłata (PLN) *"
          required
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <input
          name="sortOrder"
          type="number"
          defaultValue={item?.sortOrder ?? 0}
          placeholder="Kolejność"
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Aktywne
        </label>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Zdjęcie opakowania</p>
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
        <h1 className="text-2xl font-bold">Opakowania</h1>
        <button
          type="button"
          onClick={startNew}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        >
          + Dodaj opakowanie
        </button>
      </div>
      {showNew && !editing && form()}
      <div className="divide-y divide-border rounded-2xl bg-card shadow-card">
        {packagings.map((p) => (
          <div key={p.id}>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {p.imageUrl ? (
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <Image
                      src={p.imageUrl}
                      alt={p.namePl}
                      fill
                      className="object-contain p-1"
                      sizes="40px"
                    />
                  </div>
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                    {p.namePl.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{p.namePl}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.isActive ? "Aktywne" : "Nieaktywne"} · +{formatPrice(p.extraPricePln)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(p)}
                  className="rounded-lg border border-border px-2 py-1 text-xs"
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingPackaging(p)}
                  className="rounded-lg border border-border border-destructive px-2 py-1 text-xs text-destructive disabled:opacity-50"
                >
                  Usuń
                </button>
              </div>
            </div>
            {editing?.id === p.id && form(p)}
          </div>
        ))}
        {packagings.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Brak opakowań</p>
        )}
      </div>

      <ConfirmDialog
        open={deletingPackaging !== null}
        onOpenChange={(open) => !open && setDeletingPackaging(null)}
        title="Usuń opakowanie"
        description={`Czy na pewno chcesz usunąć opakowanie „${deletingPackaging?.namePl}"? Tej operacji nie można cofnąć.`}
        pending={deleting}
        onConfirm={() => deletingPackaging && execDelete({ id: deletingPackaging.id })}
      />
    </div>
  );
}
