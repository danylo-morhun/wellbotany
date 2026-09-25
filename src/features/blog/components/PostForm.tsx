"use client";

import type { Post } from "@prisma/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CloudinaryDropzone } from "@/components/ui/cloudinary-dropzone";
import { faqToText, textToFaq } from "@/lib/faq-text";
import { slugify } from "@/lib/slugify";
import { deletePost, savePost } from "../actions";

interface Props {
  post?: Post;
  categories: { slug: string; namePl: string }[];
}

const fieldClass = "w-full rounded-lg border border-border px-2 py-1 text-sm";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

function firstValidationError(fieldErrors: unknown): string | undefined {
  if (!fieldErrors || typeof fieldErrors !== "object") return undefined;
  for (const [field, value] of Object.entries(fieldErrors as Record<string, unknown>)) {
    const messages = (value as { _errors?: string[] } | undefined)?._errors;
    if (messages?.length) return `${field}: ${messages[0]}`;
  }
  return undefined;
}

export function PostForm({ post, categories }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.titlePl ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(post));
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { execute: execSave, isPending: saving } = useAction(savePost, {
    onSuccess: ({ data }) => {
      toast.success("Zapisano");
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
    onSuccess: () => router.push("/admin/poradnik"),
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd usuwania artykułu"),
  });

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManual) setSlug(slugify(value));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    execSave({
      id: post?.id,
      slug,
      titlePl: title,
      excerptPl: fd.get("excerptPl") as string,
      metaTitlePl: (fd.get("metaTitlePl") as string) || undefined,
      metaDescPl: (fd.get("metaDescPl") as string) || undefined,
      contentPl: fd.get("contentPl") as string,
      faqPl: textToFaq((fd.get("faqPl") as string) ?? ""),
      coverImage,
      categorySlug: (fd.get("categorySlug") as string) || undefined,
      reviewedBy: (fd.get("reviewedBy") as string) || undefined,
      isPublished: fd.get("isPublished") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl bg-card p-5 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="titlePl" className={labelClass}>
            Tytuł (H1) *
          </label>
          <input
            id="titlePl"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="slug" className={labelClass}>
            Adres: /poradnik/…
          </label>
          <input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManual(true);
            }}
            required
            className={`${fieldClass} font-mono`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="excerptPl" className={labelClass}>
          Lead – 1–2 zdania pod tytułem i na liście artykułów *
        </label>
        <textarea
          id="excerptPl"
          name="excerptPl"
          defaultValue={post?.excerptPl ?? ""}
          rows={2}
          maxLength={300}
          required
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="metaTitlePl" className={labelClass}>
            Meta title – puste = tytuł
          </label>
          <input
            id="metaTitlePl"
            name="metaTitlePl"
            defaultValue={post?.metaTitlePl ?? ""}
            maxLength={70}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="categorySlug" className={labelClass}>
            Kategoria – produkty pod artykułem
          </label>
          <select
            id="categorySlug"
            name="categorySlug"
            defaultValue={post?.categorySlug ?? ""}
            className={fieldClass}
          >
            <option value="">— brak —</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.namePl}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="metaDescPl" className={labelClass}>
          Meta description – puste = lead, do ~155 znaków
        </label>
        <textarea
          id="metaDescPl"
          name="metaDescPl"
          defaultValue={post?.metaDescPl ?? ""}
          maxLength={170}
          rows={2}
          className={fieldClass}
        />
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Okładka (16:9)</p>
        <div className="flex items-center gap-3">
          {coverImage ? (
            <div className="relative aspect-[16/9] w-28 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              <Image src={coverImage} alt="" fill className="object-cover" sizes="112px" />
            </div>
          ) : (
            <div className="flex aspect-[16/9] w-28 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground">
              brak
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            <CloudinaryDropzone variant="button" multiple={false} onUploaded={setCoverImage} />
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="lub wklej URL zdjęcia…"
              aria-label="URL okładki"
              className="rounded-lg border border-border px-2 py-1 text-xs"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="contentPl" className={labelClass}>
          Treść (HTML: h2, h3, p, ul, ol, li, strong, a, table) *
        </label>
        <textarea
          id="contentPl"
          name="contentPl"
          defaultValue={post?.contentPl ?? ""}
          rows={20}
          required
          className={`${fieldClass} font-mono text-xs`}
        />
      </div>

      <div>
        <label htmlFor="faqPl" className={labelClass}>
          FAQ – pytanie w pierwszej linii, odpowiedź poniżej, kolejne oddzielone pustą linią
        </label>
        <textarea
          id="faqPl"
          name="faqPl"
          defaultValue={faqToText(post?.faqPl)}
          rows={8}
          className={fieldClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reviewedBy" className={labelClass}>
            Sprawdził(a) – imię, nazwisko, tytuł (opcjonalnie)
          </label>
          <input
            id="reviewedBy"
            name="reviewedBy"
            defaultValue={post?.reviewedBy ?? ""}
            maxLength={120}
            className={fieldClass}
          />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" name="isPublished" defaultChecked={post?.isPublished ?? false} />
          Opublikowany
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none disabled:opacity-50"
        >
          {saving ? "Zapisywanie…" : "Zapisz"}
        </button>
        {post?.isPublished && (
          <a
            href={`/poradnik/${post.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border px-4 py-1.5 text-sm"
          >
            Zobacz w sklepie
          </a>
        )}
        {post && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="ml-auto rounded-lg border border-destructive px-4 py-1.5 text-sm text-destructive"
          >
            Usuń
          </button>
        )}
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
    </form>
  );
}
