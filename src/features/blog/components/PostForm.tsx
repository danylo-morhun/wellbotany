"use client";

import type { Post } from "@prisma/client";
import { ExternalLink, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { CloudinaryDropzone } from "@/components/ui/cloudinary-dropzone";
import { FaqEditor } from "@/features/products/components/editor/FaqEditor";
import {
  Field,
  Section,
  Switch,
  TextArea,
  TextInput,
} from "@/features/products/components/editor/fields";
import { type PickerOption, SearchSelect } from "@/features/products/components/editor/Pickers";
import { SeoPreview } from "@/features/products/components/editor/SeoPreview";
import { useUnsavedChanges } from "@/features/products/components/editor/useUnsavedChanges";
import type { FaqRow } from "@/lib/faq-text";
import { sanitizeRichText } from "@/lib/sanitize";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { deletePost, savePost } from "../actions";
import type { SavePostInput } from "../schema";

interface Props {
  post?: Post;
  categories: { slug: string; namePl: string }[];
}

type Values = {
  titlePl: string;
  slug: string;
  excerptPl: string;
  contentPl: string;
  faq: FaqRow[];
  coverImage: string;
  categorySlug: string;
  metaTitlePl: string;
  metaDescPl: string;
  reviewedBy: string;
  isPublished: boolean;
};

function initialValues(post?: Post): Values {
  return {
    titlePl: post?.titlePl ?? "",
    slug: post?.slug ?? "",
    excerptPl: post?.excerptPl ?? "",
    contentPl: post?.contentPl ?? "",
    faq: Array.isArray(post?.faqPl) ? (post.faqPl as FaqRow[]) : [],
    coverImage: post?.coverImage ?? "",
    categorySlug: post?.categorySlug ?? "",
    metaTitlePl: post?.metaTitlePl ?? "",
    metaDescPl: post?.metaDescPl ?? "",
    reviewedBy: post?.reviewedBy ?? "",
    isPublished: post?.isPublished ?? false,
  };
}

function toPayload(v: Values, id?: string): SavePostInput {
  return {
    id,
    slug: v.slug.trim(),
    titlePl: v.titlePl.trim(),
    excerptPl: v.excerptPl.trim(),
    contentPl: v.contentPl,
    faqPl: v.faq.map((r) => ({ q: r.q.trim(), a: r.a.trim() })).filter((r) => r.q && r.a),
    coverImage: v.coverImage.trim(),
    categorySlug: v.categorySlug || undefined,
    metaTitlePl: v.metaTitlePl.trim() || undefined,
    metaDescPl: v.metaDescPl.trim() || undefined,
    reviewedBy: v.reviewedBy.trim() || undefined,
    isPublished: v.isPublished,
  };
}

const FIELD_LABELS: Record<string, string> = {
  slug: "Adres",
  titlePl: "Tytuł",
  excerptPl: "Lead",
  contentPl: "Treść",
  faqPl: "FAQ",
  coverImage: "Okładka",
  metaTitlePl: "Meta tytuł",
  metaDescPl: "Meta opis",
};

function firstValidationError(fieldErrors: unknown): string | undefined {
  if (!fieldErrors || typeof fieldErrors !== "object") return undefined;
  for (const [field, value] of Object.entries(fieldErrors as Record<string, unknown>)) {
    const messages = (value as { _errors?: string[] } | undefined)?._errors;
    if (messages?.length) return `${FIELD_LABELS[field] ?? field}: ${messages[0]}`;
  }
  return undefined;
}

export function PostForm({ post, categories }: Props) {
  const router = useRouter();
  const [baseline, setBaseline] = useState(() => initialValues(post));
  const [values, setValues] = useState(baseline);
  const [slugManual, setSlugManual] = useState(Boolean(post));
  const [contentTab, setContentTab] = useState<"html" | "preview">("html");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = useCallback(<K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  }, []);
  const payload = useMemo(() => toPayload(values, post?.id), [values, post?.id]);
  const dirty = useMemo(
    () => JSON.stringify(payload) !== JSON.stringify(toPayload(baseline, post?.id)),
    [payload, baseline, post?.id],
  );
  useUnsavedChanges(dirty);

  const { execute: execSave, isPending: saving } = useAction(savePost, {
    onSuccess: ({ data }) => {
      toast.success(post ? "Zapisano zmiany" : "Artykuł utworzony");
      setBaseline(values);
      if (!post && data?.id) router.push(`/admin/poradnik/${data.id}`);
      else router.refresh();
    },
    onError: ({ error }) =>
      toast.error(
        error?.serverError ??
          firstValidationError(error?.validationErrors) ??
          "Błąd zapisu artykułu",
      ),
  });
  const { execute: execDelete, isPending: deleting } = useAction(deletePost, {
    onSuccess: () => {
      setBaseline(values);
      router.push("/admin/poradnik");
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania artykułu"),
  });

  const save = useCallback(() => execSave(payload), [execSave, payload]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty || !post) save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, post, save]);

  const categoryOptions: PickerOption[] = categories.map((c) => ({ id: c.slug, label: c.namePl }));
  const words = values.contentPl
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const preview = useMemo(
    () => (contentTab === "preview" ? sanitizeRichText(values.contentPl) : ""),
    [contentTab, values.contentPl],
  );

  return (
    <div>
      {(dirty || !post) && (
        <div className="sticky top-16 z-20 mb-4 flex items-center gap-3 rounded-xl bg-foreground py-2 pr-2 pl-4 text-sm text-background shadow-float">
          <span className="flex-1 font-medium">
            {post ? "Niezapisane zmiany" : "Nowy artykuł — nie zapisano"}
          </span>
          {post && (
            <button
              type="button"
              onClick={() => setValues(baseline)}
              className="h-8 rounded-lg px-3 font-medium text-background/80 hover:bg-background/10 hover:text-background"
            >
              Odrzuć
            </button>
          )}
          <Button onClick={save} disabled={saving} className="h-8 px-3">
            {saving ? "Zapisywanie…" : post ? "Zapisz" : "Utwórz artykuł"}
            <kbd className="ml-1 hidden rounded bg-background/15 px-1 text-[11px] sm:inline">
              ⌘S
            </kbd>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Section title="Artykuł">
            <Field
              label="Tytuł (H1)"
              htmlFor="titlePl"
              counter={{ value: values.titlePl.length, max: 200 }}
            >
              <TextInput
                id="titlePl"
                value={values.titlePl}
                onChange={(e) => {
                  set("titlePl", e.target.value);
                  if (!slugManual) set("slug", slugify(e.target.value));
                }}
                className="h-10 text-base font-medium"
              />
            </Field>
            <Field
              label="Lead"
              htmlFor="excerptPl"
              hint="1–2 zdania pod tytułem i na liście artykułów."
              counter={{ value: values.excerptPl.length, max: 300, ideal: 200 }}
            >
              <TextArea
                id="excerptPl"
                value={values.excerptPl}
                maxLength={300}
                onChange={(e) => set("excerptPl", e.target.value)}
              />
            </Field>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Treść</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {words} słów · ~{Math.max(1, Math.round(words / 200))} min czytania
                  </span>
                  <div className="flex rounded-lg bg-muted p-0.5">
                    {(["html", "preview"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={contentTab === t}
                        onClick={() => setContentTab(t)}
                        className="h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-card"
                      >
                        {t === "html" ? "HTML" : "Podgląd"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {contentTab === "html" ? (
                <TextArea
                  id="contentPl"
                  aria-label="Treść (HTML)"
                  value={values.contentPl}
                  onChange={(e) => set("contentPl", e.target.value)}
                  className="min-h-96 font-mono text-xs leading-relaxed"
                />
              ) : (
                <div
                  className="prose prose-sm max-w-none rounded-lg border border-border bg-background p-5 prose-headings:font-heading prose-a:text-primary"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with the storefront's sanitizer
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Dozwolone: h2, h3, p, ul, ol, li, strong, a, table. Tylko oświadczenia zdrowotne z
                rejestru UE (rozp. 432/2012).
              </p>
            </div>
          </Section>

          <Section
            title="Najczęstsze pytania"
            description="Pokazywane pod artykułem i jako dane strukturalne FAQ dla Google."
          >
            <FaqEditor value={values.faq} onChange={(rows) => set("faq", rows)} />
          </Section>

          <Section title="Wyszukiwarki">
            <SeoPreview
              slug={values.slug}
              pathLabel="poradnik"
              title={values.metaTitlePl || values.titlePl}
              description={values.metaDescPl || values.excerptPl}
            />
            <Field
              label="Meta tytuł"
              htmlFor="metaTitlePl"
              hint="Puste = tytuł artykułu."
              counter={{ value: values.metaTitlePl.length, max: 70, ideal: 60 }}
            >
              <TextInput
                id="metaTitlePl"
                value={values.metaTitlePl}
                maxLength={70}
                placeholder={values.titlePl}
                onChange={(e) => set("metaTitlePl", e.target.value)}
              />
            </Field>
            <Field
              label="Meta opis"
              htmlFor="metaDescPl"
              hint="Puste = lead."
              counter={{ value: values.metaDescPl.length, max: 170, ideal: 155 }}
            >
              <TextArea
                id="metaDescPl"
                value={values.metaDescPl}
                maxLength={170}
                placeholder={values.excerptPl}
                onChange={(e) => set("metaDescPl", e.target.value)}
              />
            </Field>
          </Section>
        </div>

        <aside className="space-y-6">
          <Section title="Publikacja">
            <Switch
              label="Opublikowany"
              description={values.isPublished ? "Widoczny na /poradnik" : "Szkic — niewidoczny"}
              checked={values.isPublished}
              onChange={(v) => set("isPublished", v)}
            />
            <Field
              label="Sprawdził(a)"
              htmlFor="reviewedBy"
              hint="Imię, nazwisko, tytuł — opcjonalnie."
            >
              <TextInput
                id="reviewedBy"
                value={values.reviewedBy}
                maxLength={120}
                onChange={(e) => set("reviewedBy", e.target.value)}
              />
            </Field>
            {post?.isPublished && (
              <a
                href={`/poradnik/${post.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Zobacz w sklepie
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </Section>

          <Section title="Okładka" description="Proporcje 16:9.">
            <div
              className={cn(
                "relative aspect-[16/9] overflow-hidden rounded-xl bg-muted",
                !values.coverImage &&
                  "flex items-center justify-center border border-dashed border-border",
              )}
            >
              {values.coverImage ? (
                <>
                  <Image
                    src={values.coverImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="320px"
                  />
                  <button
                    type="button"
                    aria-label="Usuń okładkę"
                    onClick={() => set("coverImage", "")}
                    className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-background/90 text-destructive shadow-sm"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Brak okładki</span>
              )}
            </div>
            <CloudinaryDropzone
              variant="button"
              multiple={false}
              onUploaded={(url) => set("coverImage", url)}
            />
            <TextInput
              type="url"
              value={values.coverImage}
              onChange={(e) => set("coverImage", e.target.value)}
              placeholder="lub wklej URL zdjęcia…"
              aria-label="URL okładki"
              className="text-xs"
            />
          </Section>

          <Section title="Powiązania">
            <Field
              label="Kategoria produktów"
              htmlFor="categorySlug"
              hint="Produkty z tej kategorii pokażą się pod artykułem."
            >
              <SearchSelect
                id="categorySlug"
                value={values.categorySlug}
                onChange={(v) => set("categorySlug", v)}
                options={categoryOptions}
                placeholder="Brak"
                searchPlaceholder="Szukaj kategorii…"
              />
            </Field>
          </Section>

          <Section title="Adres strony">
            <Field label="Slug" htmlFor="slug">
              <div className="flex items-center overflow-hidden rounded-lg border border-border bg-muted/60 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15">
                <span className="pl-3 text-xs text-muted-foreground">/poradnik/</span>
                <input
                  id="slug"
                  value={values.slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                  className="h-9 min-w-0 flex-1 bg-background px-2 font-mono text-xs outline-none"
                />
              </div>
            </Field>
          </Section>

          {post && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" aria-hidden />
              Usuń artykuł
            </button>
          )}
        </aside>
      </div>

      {post && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Usuń artykuł"
          description={`Czy na pewno chcesz usunąć „${post.titlePl}"? Tej operacji nie można cofnąć.`}
          pending={deleting}
          onConfirm={() => execDelete({ id: post.id })}
        />
      )}
    </div>
  );
}
