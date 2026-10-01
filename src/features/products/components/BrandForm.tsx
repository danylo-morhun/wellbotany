"use client";

import type { Brand } from "@prisma/client";
import { Search } from "lucide-react";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";
import { FormSheet } from "@/features/admin/components/FormSheet";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { deleteBrand, saveBrand } from "../actions";
import { Field, inputClass, TextArea, TextInput } from "./editor/fields";
import { ImageUrlInput } from "./editor/ImageUrlInput";

export type BrandRow = Brand & { productCount: number };

interface Props {
  brands: BrandRow[];
}

export function BrandForm({ brands }: Props) {
  const [editing, setEditing] = useState<BrandRow | "new" | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<BrandRow | null>(null);
  const [query, setQuery] = useState("");

  const { execute: execDelete, isPending: deleting } = useAction(deleteBrand, {
    onSuccess: () => setDeletingBrand(null),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania marki"),
  });

  // Manufacturer first, its product lines right under it
  const q = query.trim().toLowerCase();
  const matches = (b: Brand) => !q || b.name.toLowerCase().includes(q) || b.slug.includes(q);
  const ordered = brands
    .filter((b) => !b.parentBrandId)
    .flatMap((parent) => [parent, ...brands.filter((b) => b.parentBrandId === parent.id)])
    .filter(
      (b) =>
        matches(b) ||
        // keep a parent visible when one of its lines matches
        (!b.parentBrandId && brands.some((c) => c.parentBrandId === b.id && matches(c))),
    );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Marki</h1>
          <p className="mt-1 text-sm text-muted-foreground">{brands.length} marek</p>
        </div>
        <Button size="lg" onClick={() => setEditing("new")}>
          + Dodaj markę
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj marki…"
          aria-label="Szukaj marki"
          className={cn(inputClass, "h-9 pl-9")}
        />
      </div>

      <div className="divide-y divide-border rounded-2xl bg-card shadow-card">
        {ordered.map((brand) => (
          <div
            key={brand.id}
            className={cn("flex items-center gap-3 px-4 py-3", brand.parentBrandId && "pl-10")}
          >
            <BrandLogo brand={brand} size={brand.parentBrandId ? 32 : 40} />
            <button
              type="button"
              onClick={() => setEditing(brand)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-medium hover:underline">{brand.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {brand.slug}
                {brand.countryCode && ` · ${brand.countryCode}`}
              </p>
            </button>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {brand.productCount} {brand.productCount === 1 ? "produkt" : "produktów"}
            </span>
            <RowActions
              label={brand.name}
              onEdit={() => setEditing(brand)}
              onDelete={() => setDeletingBrand(brand)}
            />
          </div>
        ))}
        {ordered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            {q ? "Brak marek pasujących do wyszukiwania" : "Brak marek"}
          </p>
        )}
      </div>

      {editing && (
        <BrandSheet
          key={editing === "new" ? "new" : editing.id}
          brand={editing === "new" ? null : editing}
          brands={brands}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deletingBrand !== null}
        onOpenChange={(open) => !open && setDeletingBrand(null)}
        title="Usuń markę"
        description={
          deletingBrand?.productCount
            ? `Marka „${deletingBrand.name}" ma ${deletingBrand.productCount} produktów — po usunięciu zostaną bez marki. Tej operacji nie można cofnąć.`
            : `Czy na pewno chcesz usunąć markę „${deletingBrand?.name}"? Tej operacji nie można cofnąć.`
        }
        pending={deleting}
        onConfirm={() => deletingBrand && execDelete({ id: deletingBrand.id })}
      />
    </div>
  );
}

function BrandLogo({ brand, size }: { brand: Brand; size: number }) {
  return brand.logo ? (
    <div
      className="relative shrink-0 overflow-hidden rounded-md border border-border bg-muted"
      style={{ width: size, height: size }}
    >
      <Image src={brand.logo} alt="" fill className="object-contain p-1" sizes={`${size}px`} />
    </div>
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {brand.name.charAt(0)}
    </div>
  );
}

function BrandSheet({
  brand,
  brands,
  onClose,
}: {
  brand: Brand | null;
  brands: Brand[];
  onClose: () => void;
}) {
  const [name, setName] = useState(brand?.name ?? "");
  const [slug, setSlug] = useState(brand?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!brand);
  const [logo, setLogo] = useState(brand?.logo ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Only top-level brands can be picked as a parent — keeps the tree exactly
  // 2 levels deep (manufacturer → product line) with no cycle handling needed.
  const hasLines = !!brand && brands.some((b) => b.parentBrandId === brand.id);
  const parentOptions = brands.filter((b) => !b.parentBrandId && b.id !== brand?.id);

  const { execute, isPending } = useAction(saveBrand, {
    onSuccess: () => {
      toast.success(brand ? "Marka zapisana" : "Marka dodana");
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
        toast.error(error.serverError ?? "Błąd zapisu marki");
    },
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    setErrors({});
    execute({
      id: brand?.id,
      slug,
      name,
      logo: logo || undefined,
      description: get("description") || undefined,
      website: get("website") || undefined,
      countryCode: get("countryCode").toUpperCase() || undefined,
      parentBrandId: get("parentBrandId") || undefined,
    });
  }

  return (
    <FormSheet
      title={brand ? `Edytuj markę ${brand.name}` : "Nowa marka"}
      onClose={onClose}
      onSubmit={submit}
      pending={isPending}
      submitLabel={brand ? "Zapisz markę" : "Dodaj markę"}
    >
      <Field label="Nazwa" htmlFor="b-name" error={errors.name}>
        <TextInput
          id="b-name"
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
        htmlFor="b-slug"
        error={errors.slug}
        hint={`wellbotany.pl/marki/${slug || "…"}${slugManual ? "" : " · generowany z nazwy"}`}
      >
        <TextInput
          id="b-slug"
          required
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugManual(true);
          }}
          className="font-mono"
        />
      </Field>
      <Field
        label="Marka nadrzędna"
        htmlFor="b-parent"
        hint={
          hasLines
            ? "Ta marka ma własne linie produktów, więc sama nie może być linią innej marki"
            : "Wybierz producenta, jeśli to jego linia produktów (np. ForMeds → BICAPS)"
        }
      >
        <select
          id="b-parent"
          name="parentBrandId"
          defaultValue={brand?.parentBrandId ?? ""}
          disabled={hasLines}
          className={cn(inputClass, "h-9 disabled:opacity-60")}
        >
          <option value="">— brak (marka główna) —</option>
          {parentOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Field label="Strona www" htmlFor="b-website" error={errors.website}>
          <TextInput
            id="b-website"
            name="website"
            type="url"
            defaultValue={brand?.website ?? ""}
            placeholder="https://"
          />
        </Field>
        <Field label="Kraj" htmlFor="b-country" error={errors.countryCode}>
          <TextInput
            id="b-country"
            name="countryCode"
            defaultValue={brand?.countryCode ?? ""}
            placeholder="PL"
            maxLength={2}
            className="uppercase"
          />
        </Field>
      </div>
      <Field label="Opis" htmlFor="b-desc" hint="Krótki opis marki">
        <TextArea
          id="b-desc"
          name="description"
          defaultValue={brand?.description ?? ""}
          maxLength={2000}
        />
      </Field>
      <Field label="Logo" error={errors.logo}>
        <ImageUrlInput
          value={logo}
          onChange={setLogo}
          uploadLabel="Prześlij logo"
          alt="Logo marki"
        />
      </Field>
    </FormSheet>
  );
}
