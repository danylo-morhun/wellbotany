"use client";

import type { BannerTextPosition, BannerTextTone, HomeBanner } from "@prisma/client";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RowActions } from "@/components/ui/row-actions";
import { FormSheet } from "@/features/admin/components/FormSheet";
import { Field, Segmented, Switch, TextInput } from "@/features/products/components/editor/fields";
import { ImageUrlInput } from "@/features/products/components/editor/ImageUrlInput";
import { deleteHomeBanner, saveHomeBanner } from "../actions";

/** Date → "2026-10-01" for <input type="date"> (local day, not UTC) */
function toDateInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dateLabel = (d: Date) => d.toLocaleDateString("pl-PL");

function windowLabel(b: HomeBanner): string {
  if (!b.startsAt && !b.endsAt) return "bez daty końca";
  return `${b.startsAt ? dateLabel(b.startsAt) : "…"} – ${b.endsAt ? dateLabel(b.endsAt) : "…"}`;
}

function statusBadge(b: HomeBanner, now: Date) {
  if (!b.isActive) return <Badge>Nieaktywny</Badge>;
  if (b.startsAt && b.startsAt > now) return <Badge>Zaplanowany</Badge>;
  if (b.endsAt && b.endsAt < now) return <Badge>Zakończony</Badge>;
  return null;
}

type Props = { banners: HomeBanner[] };

export function HomeBannersAdmin({ banners }: Props) {
  const [editing, setEditing] = useState<HomeBanner | "new" | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<HomeBanner | null>(null);
  const now = new Date();

  const { execute: execDelete, isPending: deleting } = useAction(deleteHomeBanner, {
    onSuccess: () => setDeletingBanner(null),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania slajdu"),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Strona główna</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Slajder na górze strony — zalecane 3–4 slajdy, zmiana co 5 s
          </p>
        </div>
        <Button size="lg" onClick={() => setEditing("new")}>
          + Dodaj slajd
        </Button>
      </div>
      <div className="divide-y divide-border rounded-2xl bg-card shadow-card">
        {banners.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-4 py-3">
            <div className="relative h-10 w-27 shrink-0 overflow-hidden rounded-md bg-muted">
              <Image src={b.imageDesktopUrl} alt="" fill className="object-cover" sizes="108px" />
            </div>
            <button
              type="button"
              onClick={() => setEditing(b)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-medium hover:underline">{b.titlePl}</p>
              <p className="truncate text-xs text-muted-foreground">
                {b.href} · {windowLabel(b)} · kolejność {b.sortOrder}
              </p>
            </button>
            {statusBadge(b, now)}
            <RowActions
              label={b.titlePl}
              onEdit={() => setEditing(b)}
              onDelete={() => setDeletingBanner(b)}
            />
          </div>
        ))}
        {banners.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Brak slajdów — strona główna pokazuje wtedy sam nagłówek i produkty
          </p>
        )}
      </div>

      {editing && (
        <BannerSheet
          key={editing === "new" ? "new" : editing.id}
          banner={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={deletingBanner !== null}
        onOpenChange={(open) => !open && setDeletingBanner(null)}
        title="Usuń slajd"
        description={`Czy na pewno chcesz usunąć slajd „${deletingBanner?.titlePl}"? Tej operacji nie można cofnąć.`}
        pending={deleting}
        onConfirm={() => deletingBanner && execDelete({ id: deletingBanner.id })}
      />
    </div>
  );
}

function BannerSheet({ banner, onClose }: { banner: HomeBanner | null; onClose: () => void }) {
  const [imageDesktopUrl, setImageDesktopUrl] = useState(banner?.imageDesktopUrl ?? "");
  const [imageMobileUrl, setImageMobileUrl] = useState(banner?.imageMobileUrl ?? "");
  const [textPosition, setTextPosition] = useState<BannerTextPosition>(
    banner?.textPosition ?? "RIGHT",
  );
  const [textTone, setTextTone] = useState<BannerTextTone>(banner?.textTone ?? "LIGHT");
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { execute, isPending } = useAction(saveHomeBanner, {
    onSuccess: () => {
      toast.success(banner ? "Slajd zapisany" : "Slajd dodany");
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
        toast.error(error.serverError ?? "Błąd zapisu slajdu");
    },
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const text = (name: string) => String(fd.get(name) ?? "");
    setErrors({});
    execute({
      id: banner?.id,
      titlePl: text("titlePl"),
      subtitlePl: text("subtitlePl"),
      ctaLabelPl: text("ctaLabelPl"),
      href: text("href"),
      imageDesktopUrl,
      imageMobileUrl: imageMobileUrl || null,
      altPl: text("altPl"),
      textPosition,
      textTone,
      isActive,
      startsAt: text("startsAt"),
      endsAt: text("endsAt"),
      sortOrder: Number(fd.get("sortOrder") || 0),
    });
  }

  return (
    <FormSheet
      title={banner ? `Edytuj slajd` : "Nowy slajd"}
      onClose={onClose}
      onSubmit={submit}
      pending={isPending}
      submitLabel={banner ? "Zapisz slajd" : "Dodaj slajd"}
    >
      <Field
        label="Zdjęcie — komputer"
        error={errors.imageDesktopUrl}
        hint="Poziome ok. 2,7:1, np. 1920×710 px, bez napisów — tytuł dodaje sklep"
      >
        <ImageUrlInput value={imageDesktopUrl} onChange={setImageDesktopUrl} />
      </Field>
      <Field
        label="Zdjęcie — telefon"
        error={errors.imageMobileUrl}
        hint="Ok. 3:2, np. 1080×720 px; bez niego telefon pokaże przycięte zdjęcie z komputera"
      >
        <ImageUrlInput value={imageMobileUrl} onChange={setImageMobileUrl} />
      </Field>
      <Field label="Tytuł" htmlFor="hb-title" error={errors.titlePl}>
        <TextInput
          id="hb-title"
          name="titlePl"
          required
          maxLength={80}
          defaultValue={banner?.titlePl ?? ""}
          placeholder="np. Sezon na odporność"
        />
      </Field>
      <Field
        label="Podtytuł"
        htmlFor="hb-sub"
        error={errors.subtitlePl}
        hint="Bez oświadczeń zdrowotnych spoza rozporządzenia 432/2012"
      >
        <TextInput
          id="hb-sub"
          name="subtitlePl"
          maxLength={140}
          defaultValue={banner?.subtitlePl ?? ""}
          placeholder="np. Laktoferyna, cynk, selen, witamina C"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Link" htmlFor="hb-href" error={errors.href}>
          <TextInput
            id="hb-href"
            name="href"
            required
            defaultValue={banner?.href ?? ""}
            placeholder="/kategoria/na-odpornosc"
          />
        </Field>
        <Field label="Tekst przycisku" htmlFor="hb-cta" error={errors.ctaLabelPl}>
          <TextInput
            id="hb-cta"
            name="ctaLabelPl"
            maxLength={40}
            defaultValue={banner?.ctaLabelPl ?? ""}
            placeholder="np. Zobacz produkty"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tekst po stronie">
          <Segmented
            label="Tekst po stronie"
            value={textPosition}
            onChange={setTextPosition}
            options={[
              { value: "LEFT", label: "Lewej" },
              { value: "RIGHT", label: "Prawej" },
            ]}
          />
        </Field>
        <Field label="Kolor tekstu">
          <Segmented
            label="Kolor tekstu"
            value={textTone}
            onChange={setTextTone}
            options={[
              { value: "LIGHT", label: "Jasny" },
              { value: "DARK", label: "Ciemny" },
            ]}
          />
        </Field>
      </div>
      <Field
        label="Opis zdjęcia (alt)"
        htmlFor="hb-alt"
        error={errors.altPl}
        hint="Dla czytników ekranu, np. „Suplementy na odporność na drewnianym stole”"
      >
        <TextInput id="hb-alt" name="altPl" maxLength={160} defaultValue={banner?.altPl ?? ""} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Pokazuj od" htmlFor="hb-from" error={errors.startsAt}>
          <TextInput
            id="hb-from"
            name="startsAt"
            type="date"
            defaultValue={toDateInput(banner?.startsAt ?? null)}
          />
        </Field>
        <Field label="Pokazuj do" htmlFor="hb-to" error={errors.endsAt}>
          <TextInput
            id="hb-to"
            name="endsAt"
            type="date"
            defaultValue={toDateInput(banner?.endsAt ?? null)}
          />
        </Field>
        <Field label="Kolejność" htmlFor="hb-sort" hint="Mniejsza = wcześniej">
          <TextInput
            id="hb-sort"
            name="sortOrder"
            type="number"
            defaultValue={banner?.sortOrder ?? 0}
          />
        </Field>
      </div>
      <Switch
        label="Aktywny"
        description="Nieaktywny slajd nie jest pokazywany w sklepie"
        checked={isActive}
        onChange={setIsActive}
      />
    </FormSheet>
  );
}
