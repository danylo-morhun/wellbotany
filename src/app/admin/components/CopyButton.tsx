"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label,
  className,
  children,
}: {
  value: string;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={children ? undefined : label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none",
        children
          ? "h-8 border border-border px-2.5 text-sm font-medium hover:bg-muted"
          : "size-6 justify-center hover:bg-muted",
        copied && "text-success hover:text-success",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {children && (copied ? "Skopiowano" : children)}
    </button>
  );
}

/** Label/value row with a copy button — for retyping data into carrier panels */
export function CopyField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="group flex items-start justify-between gap-2 py-1">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm">{value}</p>
      </div>
      <CopyButton
        value={value}
        label={`Kopiuj: ${label}`}
        className="mt-3 opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
      />
    </div>
  );
}
