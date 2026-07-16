"use client";

import type { Category } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { slugify } from "@/lib/slugify";
import { deleteCategory, saveCategory } from "../actions";

interface Props {
  categories: Category[];
}

export function CategoryForm({ categories }: Props) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSlugManual, setFormSlugManual] = useState(false);

  const { execute: execSave, isPending: saving } = useAction(saveCategory, {
    onSuccess: () => {
      setEditing(null);
      setShowNew(false);
    },
  });
  const { execute: execDelete, isPending: deleting } = useAction(deleteCategory);

  function startNew() {
    setEditing(null);
    setFormName("");
    setFormSlug("");
    setFormSlugManual(false);
    setShowNew(true);
  }

  function startEditing(item: Category) {
    setShowNew(false);
    setFormName(item.namePl);
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
      namePl: formName,
      nameEn: (fd.get("nameEn") as string) || undefined,
      sortOrder: Number(fd.get("sortOrder") || 0),
    });
  }

  const form = (item?: Category) => (
    <form
      onSubmit={handleSubmit}
      className="mt-2 mb-4 grid gap-2 rounded-2xl bg-card p-4 shadow-card"
    >
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid grid-cols-2 gap-2">
        <input
          name="namePl"
          value={formName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Nazwa (PL) *"
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
          name="nameEn"
          defaultValue={item?.nameEn ?? ""}
          placeholder="Nazwa (EN)"
          className="rounded-lg border border-border px-2 py-1 text-sm"
        />
        <input
          name="sortOrder"
          type="number"
          defaultValue={item?.sortOrder ?? 0}
          placeholder="Kolejność"
          className="rounded-lg border border-border px-2 py-1 text-sm"
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
        <h1 className="text-2xl font-bold">Kategorie</h1>
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
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{cat.namePl}</p>
                <p className="text-xs text-muted-foreground">{cat.slug}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(cat)}
                  className="rounded-lg border border-border px-2 py-1 text-xs"
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    if (confirm(`Usunąć kategorię "${cat.namePl}"?`)) execDelete({ id: cat.id });
                  }}
                  className="rounded-lg border border-border border-destructive px-2 py-1 text-xs text-destructive disabled:opacity-50"
                >
                  Usuń
                </button>
              </div>
            </div>
            {editing?.id === cat.id && form(cat)}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Brak kategorii</p>
        )}
      </div>
    </div>
  );
}
