"use client";

import type { Brand } from "@prisma/client";
import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { slugify } from "@/lib/slugify";
import { deleteBrand, saveBrand } from "../actions";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

interface Props {
  brands: Brand[];
}

export function BrandForm({ brands }: Props) {
  const [editing, setEditing] = useState<Brand | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formSlugManual, setFormSlugManual] = useState(false);
  const [formLogo, setFormLogo] = useState("");
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

  const { execute: execSave, isPending: saving } = useAction(saveBrand, {
    onSuccess: () => {
      setEditing(null);
      setShowNew(false);
    },
  });
  const { execute: execDelete, isPending: deleting } = useAction(deleteBrand, {
    onSuccess: () => setDeletingBrand(null),
  });

  function startNew() {
    setEditing(null);
    setFormName("");
    setFormSlug("");
    setFormSlugManual(false);
    setFormLogo("");
    setShowNew(true);
  }

  function startEditing(item: Brand) {
    setShowNew(false);
    setFormName(item.name);
    setFormSlug(item.slug);
    setFormSlugManual(true);
    setFormLogo(item.logo ?? "");
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
      logo: formLogo || undefined,
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

      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Logo marki</p>
        <div className="flex items-center gap-3">
          {formLogo ? (
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              <Image src={formLogo} alt="Logo" fill className="object-contain p-1" sizes="56px" />
            </div>
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground">
              brak
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            {CLOUD_NAME && UPLOAD_PRESET ? (
              <CldUploadWidget
                uploadPreset={UPLOAD_PRESET}
                onSuccess={(result) => {
                  const info = result.info as { secure_url: string } | undefined;
                  if (info?.secure_url) setFormLogo(info.secure_url);
                }}
              >
                {({ open }) => (
                  <button
                    type="button"
                    onClick={() => open()}
                    className="self-start rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
                  >
                    Prześlij logo
                  </button>
                )}
              </CldUploadWidget>
            ) : null}
            <div className="flex gap-2">
              <input
                type="url"
                value={formLogo}
                onChange={(e) => setFormLogo(e.target.value)}
                placeholder="lub wklej URL logo…"
                className="flex-1 rounded-lg border border-border px-2 py-1 text-xs"
              />
              {formLogo && (
                <button
                  type="button"
                  onClick={() => setFormLogo("")}
                  className="rounded-lg border border-border px-2 py-1 text-xs text-destructive"
                >
                  Usuń
                </button>
              )}
            </div>
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
              <div className="flex items-center gap-3">
                {brand.logo ? (
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      fill
                      className="object-contain p-1"
                      sizes="40px"
                    />
                  </div>
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-bold text-muted-foreground">
                    {brand.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{brand.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {brand.slug}
                    {brand.countryCode && ` · ${brand.countryCode}`}
                  </p>
                </div>
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
                  onClick={() => setDeletingBrand(brand)}
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

      <ConfirmDialog
        open={deletingBrand !== null}
        onOpenChange={(open) => !open && setDeletingBrand(null)}
        title="Usuń markę"
        description={`Czy na pewno chcesz usunąć markę „${deletingBrand?.name}"? Tej operacji nie można cofnąć.`}
        pending={deleting}
        onConfirm={() => deletingBrand && execDelete({ id: deletingBrand.id })}
      />
    </div>
  );
}
