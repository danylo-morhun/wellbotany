"use client";

import type { Tag, TagType } from "@prisma/client";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";
import { FormSheet } from "@/features/admin/components/FormSheet";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { deleteTag, saveTag } from "../actions";
import { Field, inputClass, TextInput } from "./editor/fields";

const TAG_TYPE_LABELS: Record<TagType, string> = {
  DIETARY_CLAIM: "Dieta",
  ALLERGEN_FREE: "Bez alergenów",
  CERTIFICATION: "Certyfikat",
  OTHER: "Inne",
};

export type TagRow = Tag & { productCount: number };

interface Props {
  tags: TagRow[];
}

export function TagForm({ tags }: Props) {
  const [editing, setEditing] = useState<TagRow | "new" | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagRow | null>(null);

  const { execute: execDelete, isPending: deleting } = useAction(deleteTag, {
    onSuccess: () => setDeletingTag(null),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania tagu"),
  });

  const groups = (Object.keys(TAG_TYPE_LABELS) as TagType[])
    .map((type) => ({ type, items: tags.filter((t) => t.type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Tagi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cechy produktu widoczne w filtrach sklepu (dieta, alergeny, certyfikaty)
          </p>
        </div>
        <Button size="lg" onClick={() => setEditing("new")}>
          + Dodaj tag
        </Button>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.type}>
            <h2 className="mb-2 text-sm font-semibold">
              {TAG_TYPE_LABELS[group.type]}{" "}
              <span className="font-normal text-muted-foreground">{group.items.length}</span>
            </h2>
            <div className="divide-y divide-border rounded-2xl bg-card shadow-card">
              {group.items.map((tag) => (
                <div key={tag.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setEditing(tag)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-medium hover:underline">{tag.namePl}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tag.slug}
                      {tag.nameEn && ` · ${tag.nameEn}`}
                    </p>
                  </button>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {tag.productCount} {tag.productCount === 1 ? "produkt" : "produktów"}
                  </span>
                  <RowActions
                    label={tag.namePl}
                    onEdit={() => setEditing(tag)}
                    onDelete={() => setDeletingTag(tag)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
        {tags.length === 0 && (
          <p className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-card">
            Brak tagów
          </p>
        )}
      </div>

      {editing && (
        <TagSheet
          key={editing === "new" ? "new" : editing.id}
          tag={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deletingTag !== null}
        onOpenChange={(open) => !open && setDeletingTag(null)}
        title="Usuń tag"
        description={
          deletingTag?.productCount
            ? `Tag „${deletingTag.namePl}" jest przypisany do ${deletingTag.productCount} produktów — zostanie z nich usunięty. Tej operacji nie można cofnąć.`
            : `Czy na pewno chcesz usunąć tag „${deletingTag?.namePl}"? Tej operacji nie można cofnąć.`
        }
        pending={deleting}
        onConfirm={() => deletingTag && execDelete({ id: deletingTag.id })}
      />
    </div>
  );
}

function TagSheet({ tag, onClose }: { tag: Tag | null; onClose: () => void }) {
  const [name, setName] = useState(tag?.namePl ?? "");
  const [slug, setSlug] = useState(tag?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!tag);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { execute, isPending } = useAction(saveTag, {
    onSuccess: () => {
      toast.success(tag ? "Tag zapisany" : "Tag dodany");
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
        toast.error(error.serverError ?? "Błąd zapisu tagu");
    },
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErrors({});
    execute({
      id: tag?.id,
      slug,
      namePl: name,
      nameEn: String(fd.get("nameEn") ?? "").trim() || undefined,
      type: fd.get("type") as TagType,
      sortOrder: Number(fd.get("sortOrder") || 0),
    });
  }

  return (
    <FormSheet
      title={tag ? `Edytuj tag ${tag.namePl}` : "Nowy tag"}
      onClose={onClose}
      onSubmit={submit}
      pending={isPending}
      submitLabel={tag ? "Zapisz tag" : "Dodaj tag"}
    >
      <Field label="Nazwa" htmlFor="t-name" error={errors.namePl}>
        <TextInput
          id="t-name"
          required
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugManual) setSlug(slugify(e.target.value));
          }}
          placeholder="np. Wegański"
        />
      </Field>
      <Field
        label="Slug"
        htmlFor="t-slug"
        error={errors.slug}
        hint={slugManual ? undefined : "Generowany z nazwy"}
      >
        <TextInput
          id="t-slug"
          required
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugManual(true);
          }}
          className="font-mono"
        />
      </Field>
      <Field label="Nazwa (EN)" htmlFor="t-name-en" error={errors.nameEn}>
        <TextInput id="t-name-en" name="nameEn" defaultValue={tag?.nameEn ?? ""} />
      </Field>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Rodzaj" htmlFor="t-type">
          <select
            id="t-type"
            name="type"
            defaultValue={tag?.type ?? "OTHER"}
            className={cn(inputClass, "h-9")}
          >
            {Object.entries(TAG_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kolejność" htmlFor="t-sort" hint="Mniejsza = wyżej">
          <TextInput
            id="t-sort"
            name="sortOrder"
            type="number"
            defaultValue={tag?.sortOrder ?? 0}
          />
        </Field>
      </div>
    </FormSheet>
  );
}
