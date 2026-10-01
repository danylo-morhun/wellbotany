"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CloudinaryDropzone } from "@/components/ui/cloudinary-dropzone";
import { TextInput } from "./fields";

/** Single image: preview, Cloudinary upload, or a pasted URL. */
export function ImageUrlInput({
  value,
  onChange,
  uploadLabel = "Prześlij zdjęcie",
  alt = "",
}: {
  value: string;
  onChange: (url: string) => void;
  uploadLabel?: string;
  alt?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {value ? (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          <Image src={value} alt={alt} fill className="object-contain p-1" sizes="64px" />
        </div>
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-xs text-muted-foreground">
          brak
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex gap-2">
          <CloudinaryDropzone
            variant="button"
            multiple={false}
            buttonLabel={uploadLabel}
            onUploaded={onChange}
          />
          {value && (
            <Button type="button" variant="ghost" size="lg" onClick={() => onChange("")}>
              Usuń
            </Button>
          )}
        </div>
        <TextInput
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="lub wklej URL…"
          aria-label="URL zdjęcia"
        />
      </div>
    </div>
  );
}
