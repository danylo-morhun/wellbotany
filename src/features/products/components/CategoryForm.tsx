"use client";

import type { Category, CategoryGroup } from "@prisma/client";
import { MoreHorizontal } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormSheet } from "@/features/admin/components/FormSheet";
import { getCategoryIcon } from "@/lib/category-icons";
import type { FaqRow } from "@/lib/faq-text";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { deleteCategory, saveCategory } from "../actions";
import { CategoryIconPicker } from "./CategoryIconPicker";
import { FaqEditor } from "./editor/FaqEditor";
import { Field, inputClass, TextArea, TextInput } from "./editor/fields";
import { SeoPreview } from "./editor/SeoPreview";

interface Props {
  categories: Category[];
  /** Products listed in each category (primary or extra), by category id */
  productCounts: Record<string, number>;
}

const GROUP_SHORT: Record<CategoryGroup, string> = {
  TYPE: "Rodzaj",
  NEED: "Na co",
  AUDIENCE: "Dla kogo",
  OTHER: "Inne",
};

const GROUP_OPTIONS: { value: CategoryGroup; label: string }[] = [
  { value: "TYPE", label: "Rodzaj (co to jest)" },
  { value: "NEED", label: "Na co" },
  { value: "AUDIENCE", label: "Dla kogo" },
  { value: "OTHER", label: "Inne (kosmetyki, żywność…)" },
];

export function CategoryForm({ categories, productCounts }: Props) {
  const [groupFilter, setGroupFilter] = useState<CategoryGroup | "ALL">("ALL");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState("");

  const { execute: execDelete, isPending: deleting } = useAction(deleteCategory, {
    onSuccess: () => setDeletingCategory(null),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania kategorii"),
  });

  const q = search.trim().toLowerCase();
  const inGroup = (cat: Category) => groupFilter === "ALL" || cat.group === groupFilter;
  const filtered = categories
    .filter((cat) => inGroup(cat) && (!q || cat.namePl.toLowerCase().includes(q)))
    .sort((a, b) => a.namePl.localeCompare(b.namePl, "pl"));
  const groupCount = (g: CategoryGroup | "ALL") =>
    g === "ALL" ? categories.length : categories.filter((c) => c.group === g).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Kategorie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Menu sklepu: rodzaje produktów, potrzeby („na co”) i grupy odbiorców.
          </p>
        </div>
        <Button size="lg" onClick={() => setEditing("new")}>
          + Dodaj kategorię
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj kategorii…"
          aria-label="Szukaj kategorii"
          className={cn(inputClass, "h-9 max-w-xs")}
        />
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {(["ALL", ...GROUP_OPTIONS.map((g) => g.value)] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={groupFilter === g}
              onClick={() => setGroupFilter(g)}
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-card"
            >
              {g === "ALL" ? "Wszystkie" : GROUP_SHORT[g]}
              <span className="text-xs tabular-nums opacity-70">{groupCount(g)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-border/70 rounded-2xl bg-card shadow-card">
        {filtered.map((cat) => {
          const Icon = getCategoryIcon(cat.icon);
          const count = productCounts[cat.id] ?? 0;
          return (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                {Icon ? (
                  <Icon className="size-4" />
                ) : (
                  <span className="text-xs font-bold">{cat.namePl.charAt(0)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditing(cat)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate font-medium hover:text-primary">{cat.namePl}</p>
                <p className="truncate text-xs text-muted-foreground">
                  /kategoria/{cat.slug} · {GROUP_SHORT[cat.group]}
                </p>
              </button>
              <a
                href={`/admin/produkty?kategoria=${cat.id}`}
                className={cn(
                  "shrink-0 text-xs tabular-nums hover:text-primary",
                  count === 0 ? "text-warning-foreground" : "text-muted-foreground",
                )}
              >
                {count} prod.
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Akcje dla ${cat.namePl}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted aria-expanded:bg-muted"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setEditing(cat)}>Edytuj</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => window.open(`/kategoria/${cat.slug}`, "_blank", "noopener")}
                  >
                    Zobacz w sklepie
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive onClick={() => setDeletingCategory(cat)}>
                    Usuń
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Brak kategorii</p>
        )}
      </div>

      {editing && (
        <CategorySheet
          key={editing === "new" ? "new" : editing.id}
          category={editing === "new" ? null : editing}
          categories={categories}
          productCount={editing === "new" ? 0 : (productCounts[editing.id] ?? 0)}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deletingCategory !== null}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="Usuń kategorię"
        description={`Czy na pewno chcesz usunąć kategorię „${deletingCategory?.namePl}"? Tej operacji nie można cofnąć.`}
        pending={deleting}
        onConfirm={() => deletingCategory && execDelete({ id: deletingCategory.id })}
      />
    </div>
  );
}

function CategorySheet({
  category,
  categories,
  productCount,
  onClose,
}: {
  category: Category | null;
  categories: Category[];
  productCount: number;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.namePl ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!category);
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [heading, setHeading] = useState(category?.headingPl ?? "");
  const [description, setDescription] = useState(category?.descriptionPl ?? "");
  const [metaTitle, setMetaTitle] = useState(category?.metaTitlePl ?? "");
  const [metaDesc, setMetaDesc] = useState(category?.metaDescPl ?? "");
  const [faq, setFaq] = useState<FaqRow[]>(
    Array.isArray(category?.faqPl) ? (category.faqPl as FaqRow[]) : [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // A category with subcategories stays top-level — the menu is 2 levels deep
  const hasChildren = !!category && categories.some((c) => c.parentId === category.id);

  const { execute, isPending } = useAction(saveCategory, {
    onSuccess: () => {
      toast.success(category ? "Kategoria zapisana" : "Kategoria dodana");
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
        toast.error(error.serverError ?? "Błąd zapisu kategorii");
    },
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    setErrors({});
    execute({
      id: category?.id,
      slug,
      namePl: name,
      nameEn: get("nameEn") || undefined,
      // Not editable here — the action nulls whatever is left out
      nameUk: category?.nameUk ?? undefined,
      image: category?.image ?? undefined,
      headingPl: heading.trim() || undefined,
      descriptionPl: description.trim() || undefined,
      metaTitlePl: metaTitle.trim() || undefined,
      metaDescPl: metaDesc.trim() || undefined,
      contentPl: get("contentPl") || undefined,
      faqPl: faq.map((r) => ({ q: r.q.trim(), a: r.a.trim() })).filter((r) => r.q && r.a),
      group: fd.get("group") as CategoryGroup,
      // Sent every time: the action writes null for a missing parent/description,
      // which used to detach a category from its parent on any edit.
      parentId: get("parentId") || undefined,
      icon: icon || undefined,
      sortOrder: Number(fd.get("sortOrder") || 0),
    });
  }

  const shownHeading = heading.trim() || name;

  return (
    <FormSheet
      wide
      title={category ? `Edytuj kategorię ${category.namePl}` : "Nowa kategoria"}
      description={
        category && (
          <>
            {productCount} {productCount === 1 ? "produkt" : "produktów"} ·{" "}
            <a
              href={`/kategoria/${category.slug}`}
              target="_blank"
              rel="noopener"
              className="text-primary hover:underline"
            >
              Zobacz w sklepie
            </a>
          </>
        )
      }
      onClose={onClose}
      onSubmit={submit}
      pending={isPending}
      submitLabel={category ? "Zapisz kategorię" : "Dodaj kategorię"}
    >
      <SheetGroup title="Podstawowe">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nazwa" htmlFor="c-name" error={errors.namePl}>
            <TextInput
              id="c-name"
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
            htmlFor="c-slug"
            error={errors.slug}
            hint={slugManual ? undefined : "Generowany z nazwy"}
          >
            <TextInput
              id="c-slug"
              required
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManual(true);
              }}
              className="font-mono"
            />
          </Field>
          <Field label="Grupa w menu" htmlFor="c-group">
            <select
              id="c-group"
              name="group"
              defaultValue={category?.group ?? "TYPE"}
              className={cn(inputClass, "h-9")}
            >
              {GROUP_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Kategoria nadrzędna"
            htmlFor="c-parent"
            hint={hasChildren ? "Ma podkategorie, więc zostaje główną" : undefined}
          >
            <select
              id="c-parent"
              name="parentId"
              defaultValue={category?.parentId ?? ""}
              disabled={hasChildren}
              className={cn(inputClass, "h-9 disabled:opacity-60")}
            >
              <option value="">— brak (kategoria główna) —</option>
              {categories
                .filter((c) => c.parentId === null && c.id !== category?.id)
                .sort((a, b) => a.namePl.localeCompare(b.namePl, "pl"))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.namePl}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Ikona" htmlFor="c-icon">
            <CategoryIconPicker id="c-icon" value={icon} onChange={setIcon} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nazwa (EN)" htmlFor="c-name-en">
              <TextInput id="c-name-en" name="nameEn" defaultValue={category?.nameEn ?? ""} />
            </Field>
            <Field label="Kolejność" htmlFor="c-sort">
              <TextInput
                id="c-sort"
                name="sortOrder"
                type="number"
                defaultValue={category?.sortOrder ?? 0}
              />
            </Field>
          </div>
        </div>
      </SheetGroup>

      <SheetGroup title="Strona kategorii">
        <Field
          label="Nagłówek H1"
          htmlFor="c-heading"
          hint={`Puste = nazwa kategorii („${name || "…"}”)`}
          counter={{ value: heading.length, max: 200 }}
        >
          <TextInput
            id="c-heading"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            placeholder="np. Suplementy na sen"
          />
        </Field>
        <Field
          label="Opis pod nagłówkiem"
          htmlFor="c-desc"
          counter={{ value: description.length, max: 4000 }}
          error={errors.descriptionPl}
        >
          <TextArea
            id="c-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Field>
        <Field
          label="Poradnik pod listą produktów"
          htmlFor="c-content"
          hint="HTML: h2, h3, p, ul, li, strong, a. Tylko oświadczenia zdrowotne z rejestru UE (432/2012)."
          error={errors.contentPl}
        >
          <TextArea
            id="c-content"
            name="contentPl"
            defaultValue={category?.contentPl ?? ""}
            className="min-h-40 font-mono text-xs"
          />
        </Field>
      </SheetGroup>

      <SheetGroup
        title="Najczęstsze pytania"
        description="Pod listą produktów i jako FAQ dla Google"
      >
        <FaqEditor value={faq} onChange={setFaq} />
      </SheetGroup>

      <SheetGroup title="Wyszukiwarki">
        <Field
          label="Meta title"
          htmlFor="c-meta-title"
          hint="Puste = nagłówek H1"
          counter={{ value: metaTitle.length, max: 70, ideal: 60 }}
          error={errors.metaTitlePl}
        >
          <TextInput
            id="c-meta-title"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            maxLength={70}
          />
        </Field>
        <Field
          label="Meta description"
          htmlFor="c-meta-desc"
          hint="Puste = opis pod nagłówkiem"
          counter={{ value: metaDesc.length, max: 170, ideal: 155 }}
          error={errors.metaDescPl}
        >
          <TextArea
            id="c-meta-desc"
            value={metaDesc}
            onChange={(e) => setMetaDesc(e.target.value)}
            maxLength={170}
            rows={2}
          />
        </Field>
        <SeoPreview
          slug={slug}
          pathLabel="kategoria"
          title={metaTitle.trim() || shownHeading}
          description={metaDesc.trim() || description.trim()}
        />
      </SheetGroup>
    </FormSheet>
  );
}

function SheetGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-b border-border pb-6 last:border-0 last:pb-0">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
