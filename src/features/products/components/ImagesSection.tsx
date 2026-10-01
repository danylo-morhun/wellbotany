"use client";

import type { ProductImage } from "@prisma/client";
import { ArrowLeft, ArrowRight, Link2, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { CloudinaryDropzone } from "@/components/ui/cloudinary-dropzone";
import { cn } from "@/lib/utils";
import {
  addProductImage,
  deleteProductImage,
  moveImage,
  setImageAlt,
  setImageVariant,
  setMainImage,
} from "../actions";
import { inputClass } from "./editor/fields";

interface Props {
  productId: string;
  images: ProductImage[];
  variants: { id: string; sku: string; optionValue: string | null }[];
}

export function ImagesSection({ productId, images, variants }: Props) {
  const [deletingImage, setDeletingImage] = useState<ProductImage | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const onError =
    (fallback: string) =>
    ({ error }: { error: { serverError?: string } }) =>
      toast.error(error?.serverError ?? fallback);

  const { execute: execAdd } = useAction(addProductImage, {
    onSuccess: () => toast.success("Zdjęcie dodane"),
    onError: onError("Błąd dodawania zdjęcia"),
  });
  const { execute: execSetVariant } = useAction(setImageVariant, {
    onError: onError("Błąd przypisania wariantu"),
  });
  const { execute: execMain } = useAction(setMainImage, {
    onError: onError("Nie udało się ustawić zdjęcia głównego"),
  });
  const { execute: execMove, isPending: moving } = useAction(moveImage, {
    onError: onError("Nie udało się zmienić kolejności"),
  });
  const { execute: execAlt } = useAction(setImageAlt, {
    onSuccess: () => toast.success("Opis zdjęcia zapisany"),
    onError: onError("Błąd zapisu opisu"),
  });
  const { execute: execDelete, isPending: deleting } = useAction(deleteProductImage, {
    onSuccess: () => setDeletingImage(null),
    onError: onError("Błąd usuwania zdjęcia"),
  });

  return (
    <section className="rounded-2xl bg-card shadow-card">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-semibold">Zdjęcia</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pierwsze zdjęcie oznaczone gwiazdką jest główne — w listingach i w Google.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setShowUrl((v) => !v)} aria-expanded={showUrl}>
          <Link2 aria-hidden />Z adresu URL
        </Button>
      </div>
      <div className="space-y-4 p-5">
        {showUrl && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const url = fd.get("url") as string;
              if (!url) return;
              execAdd({ productId, url, isMain: images.length === 0, sortOrder: images.length });
              e.currentTarget.reset();
            }}
            className="flex gap-2"
          >
            <input
              name="url"
              type="url"
              placeholder="https://…"
              required
              aria-label="Adres URL zdjęcia"
              className={`${inputClass} h-9 flex-1`}
            />
            <Button type="submit">Dodaj</Button>
          </form>
        )}

        {images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {images.map((img, i) => (
              <li key={img.id} className="group">
                <div
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border",
                    img.isMain && "ring-2 ring-primary",
                  )}
                >
                  <Image
                    src={img.url}
                    alt={img.altPl ?? ""}
                    fill
                    className="object-contain p-2"
                    sizes="200px"
                  />
                  {img.isMain && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                      <Star className="size-3 fill-current" aria-hidden />
                      Główne
                    </span>
                  )}
                  <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none">
                    <div className="flex gap-1">
                      <ImgBtn
                        label="Przesuń w lewo"
                        disabled={i === 0 || moving}
                        onClick={() => execMove({ imageId: img.id, productId, direction: "up" })}
                      >
                        <ArrowLeft />
                      </ImgBtn>
                      <ImgBtn
                        label="Przesuń w prawo"
                        disabled={i === images.length - 1 || moving}
                        onClick={() => execMove({ imageId: img.id, productId, direction: "down" })}
                      >
                        <ArrowRight />
                      </ImgBtn>
                    </div>
                    <div className="flex gap-1">
                      {!img.isMain && (
                        <ImgBtn
                          label="Ustaw jako główne"
                          onClick={() => execMain({ imageId: img.id, productId })}
                        >
                          <Star />
                        </ImgBtn>
                      )}
                      <ImgBtn
                        label="Usuń zdjęcie"
                        destructive
                        onClick={() => setDeletingImage(img)}
                      >
                        <Trash2 />
                      </ImgBtn>
                    </div>
                  </div>
                </div>
                <input
                  defaultValue={img.altPl ?? ""}
                  placeholder="Opis zdjęcia (alt)"
                  aria-label="Opis zdjęcia (alt)"
                  maxLength={200}
                  onBlur={(e) => {
                    const alt = e.target.value.trim();
                    if (alt !== (img.altPl ?? ""))
                      execAlt({ imageId: img.id, productId, altPl: alt });
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className="mt-1.5 h-7 w-full rounded-md border border-transparent bg-transparent px-1.5 text-xs placeholder:text-muted-foreground/70 hover:border-border focus:border-ring focus:outline-none"
                />
                {variants.length > 1 && (
                  <select
                    aria-label="Wariant zdjęcia"
                    value={img.variantId ?? ""}
                    onChange={(e) =>
                      execSetVariant({
                        imageId: img.id,
                        productId,
                        variantId: e.target.value || null,
                      })
                    }
                    className="h-7 w-full truncate rounded-md border border-border bg-card px-1.5 text-xs"
                  >
                    <option value="">Wszystkie warianty</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.optionValue ?? v.sku}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
        )}

        <CloudinaryDropzone
          onUploaded={(url) =>
            execAdd({ productId, url, isMain: images.length === 0, sortOrder: images.length })
          }
        />
      </div>

      <ConfirmDialog
        open={deletingImage !== null}
        onOpenChange={(open) => !open && setDeletingImage(null)}
        title="Usuń zdjęcie"
        description="Czy na pewno chcesz usunąć to zdjęcie? Tej operacji nie można cofnąć."
        pending={deleting}
        onConfirm={() => deletingImage && execDelete({ imageId: deletingImage.id, productId })}
      />
    </section>
  );
}

function ImgBtn({
  label,
  destructive,
  children,
  ...props
}: {
  label: string;
  destructive?: boolean;
  children: React.ReactNode;
} & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm backdrop-blur hover:bg-background disabled:opacity-40 [&_svg]:size-3.5",
        destructive && "text-destructive",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
