"use client";

import type { Brand } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { slugify } from "@/lib/slugify";
import { deleteBrand, saveBrand } from "../actions";

interface Props {
  brands: Brand[];
}

export function BrandForm({ brands }: Props) {
  const [editing, setEditing] = useState<Brand | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSlugManual, setFormSlugManual] = useState(false);

  const { execute: execSave, isPending: saving } = useAction(saveBrand, {
    onSuccess: () => {
      setEditing(null);
      setShowNew(false);
    },
  });
  const { execute: execDelete, isPending: deleting } = useAction(deleteBrand);

  function startNew() {
    setEditing(null);
    setFormName("");
    setFormSlug("");
    setFormSlugManual(false);
    setShowNew(true);
  }

  function startEditing(item: Brand) {
    setShowNew(false);
    setFormName(item.name);
    setFormSlug(item.slug);
    setFormSlugManual(true);
    setEditing(item);
  }

  function cancelForm() {
    setEditing(null);
    setShowNew(false);
  }

  function handleNameChange(value: string) {
    setFormName(value);
    if (!formSlugManual) setFormSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setFormSlug(value);
    setFormSlugManual(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    execSave({
      id: (fd.get("id") as string) || undefined,
      slug: formSlug,
      name: formName,
      description: (fd.get("description") as string) || undefined,
      website: (fd.get("website") as string) || undefined,
      countryCode: (fd.get("countryCode") as string) || undefined,
    });
  }

  const form = (item?: Brand) => (
    <form
      onSubmit={handleSubmit}
      className="mt-2 mb-4 grid gap-3 rounded-2xl bg-card p-4 shadow-card"
    >
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid grid-cols-2 gap-2">
        <input
          name="name"
          value={formName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Nazwa *"
          required
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <div className="relative">
          <input
            name="slug"
            value={formSlug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="Slug *"
            required
            className="w-full rounded-lg border border-border px-2 py-1 font-mono text-sm"
          />
          {!formSlugManual && (
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-muted px-1 py-0.5 text-xs text-muted-foreground">
              auto
            </span>
          )}
        </div>
        <input
          name="website"
          defaultValue={item?.website ?? ""}
          placeholder="Strona www"
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <input
          name="countryCode"
          defaultValue={item?.countryCode ?? ""}
          placeholder="Kraj (PL, DE…)"
          maxLength={2}
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <input
          name="description"
          defaultValue={item?.description ?? ""}
          placeholder="Opis"
          className="col-span-2 rounded-lg border border-border px-2 py-1 text-sm"
        />
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
        <h1 className="text-2xl font-bold">Marki</h1>
        <button
          type="button"
          onClick={startNew}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        >
          + Dodaj
        </button>
      </div>
      {showNew && !editing && form()}
      <div className="divide-y divide-border rounded-2xl bg-card shadow-card">
        {brands.map((brand) => (
          <div key={brand.id}>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{brand.name}</p>
                <p className="text-xs text-muted-foreground">
                  {brand.slug}
                  {brand.countryCode && ` · ${brand.countryCode}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(brand)}
                  className="rounded-lg border border-border px-2 py-1 text-xs"
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    if (confirm(`Usunąć markę "${brand.name}"?`)) execDelete({ id: brand.id });
                  }}
                  className="rounded-lg border border-border border-destructive px-2 py-1 text-xs text-destructive disabled:opacity-50"
                >
                  Usuń
                </button>
              </div>
            </div>
            {editing?.id === brand.id && form(brand)}
          </div>
        ))}
        {brands.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Brak marek</p>
        )}
      </div>
    </div>
  );
}
