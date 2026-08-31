"use client";

import { UploadCloud } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function useCloudinaryUpload(onUploaded: (url: string) => void) {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        toast.error("Cloudinary nie skonfigurowany");
        return;
      }
      setIsUploading(true);
      try {
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("upload_preset", UPLOAD_PRESET);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error(await res.text());
          const data = (await res.json()) as { secure_url: string };
          onUploaded(data.secure_url);
        }
      } catch {
        toast.error("Błąd przesyłania zdjęcia");
      } finally {
        setIsUploading(false);
      }
    },
    [onUploaded],
  );

  return { uploadFiles, isUploading };
}

interface Props {
  onUploaded: (url: string) => void;
  multiple?: boolean;
  disabled?: boolean;
  /** "box" — big dashed drop zone; "button" — compact inline trigger next to a preview thumbnail */
  variant?: "box" | "button";
  buttonLabel?: string;
}

export function CloudinaryDropzone({
  onUploaded,
  multiple = true,
  disabled,
  variant = "box",
  buttonLabel = "Prześlij zdjęcie",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { uploadFiles, isUploading } = useCloudinaryUpload(onUploaded);

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple={multiple}
      disabled={disabled || isUploading}
      className="hidden"
      onChange={(e) => {
        if (e.target.files?.length) uploadFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (variant === "button") {
    return (
      <>
        {input}
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="self-start rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep disabled:opacity-50 motion-reduce:transition-none"
        >
          {isUploading ? "Przesyłanie…" : buttonLabel}
        </button>
      </>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop zone; the nested button handles keyboard access
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled && e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
      }}
    >
      {input}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors duration-200 motion-reduce:transition-none ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        } ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
      >
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isUploading ? "Przesyłanie…" : "Przeciągnij zdjęcie tutaj lub kliknij, aby wybrać"}
        </p>
      </button>
    </div>
  );
}
