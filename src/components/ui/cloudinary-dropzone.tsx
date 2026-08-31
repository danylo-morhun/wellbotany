"use client";

import { UploadCloud } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function uploadOne(file: File, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { secure_url } = JSON.parse(xhr.responseText) as { secure_url: string };
        // Next's own image optimizer is disabled (unoptimized: true, Vercel Hobby
        // quota) — Cloudinary's f_auto/q_auto delivers modern formats + compression
        // instead, applied at the URL level so it works everywhere the URL is used.
        resolve(secure_url.replace("/upload/", "/upload/f_auto,q_auto/"));
      } else {
        reject(new Error(xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error("network error"));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET as string);
    xhr.send(fd);
  });
}

function useCloudinaryUpload(onUploaded: (url: string) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileIndex, setFileIndex] = useState(0);
  const [fileTotal, setFileTotal] = useState(0);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        toast.error("Cloudinary nie skonfigurowany");
        return;
      }
      const list = Array.from(files);
      setIsUploading(true);
      setFileTotal(list.length);
      try {
        for (let i = 0; i < list.length; i++) {
          setFileIndex(i + 1);
          setProgress(0);
          const url = await uploadOne(list[i], setProgress);
          onUploaded(url);
        }
      } catch {
        toast.error("Błąd przesyłania zdjęcia");
      } finally {
        setIsUploading(false);
        setProgress(0);
        setFileIndex(0);
        setFileTotal(0);
      }
    },
    [onUploaded],
  );

  return { uploadFiles, isUploading, progress, fileIndex, fileTotal };
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
  const { uploadFiles, isUploading, progress, fileIndex, fileTotal } =
    useCloudinaryUpload(onUploaded);

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

  const progressLabel =
    fileTotal > 1
      ? `Przesyłanie ${fileIndex}/${fileTotal}… ${progress}%`
      : `Przesyłanie… ${progress}%`;

  if (variant === "button") {
    return (
      <div className="flex flex-col gap-1.5">
        {input}
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="self-start rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep disabled:opacity-50 motion-reduce:transition-none"
        >
          {isUploading ? progressLabel : buttonLabel}
        </button>
        {isUploading && (
          <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
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
          {isUploading ? progressLabel : "Przeciągnij zdjęcie tutaj lub kliknij, aby wybrać"}
        </p>
        {isUploading && (
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </button>
    </div>
  );
}
