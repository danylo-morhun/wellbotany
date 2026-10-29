import { cn } from "@/lib/utils";

/** Text input / textarea look; border-input keeps the outline at 3:1. */
export const inputClass =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary aria-invalid:border-destructive";

/** Per-field message; `id` must match fieldA11y(...).errorId. Renders nothing without a message. */
export function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}

/** Form-level error, announced when it appears. */
export function FormError({ message, className }: { message?: string | null; className?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive-ink",
        className,
      )}
    >
      {message}
    </p>
  );
}
