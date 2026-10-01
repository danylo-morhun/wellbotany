"use client";

import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 text-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/15 aria-invalid:border-destructive motion-reduce:transition-none";

export function Section({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-2xl bg-card shadow-card", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  counter,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  counter?: { value: number; max: number; ideal?: number };
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const over = counter && counter.value > counter.max;
  const beyondIdeal = counter?.ideal && counter.value > counter.ideal;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {counter && (
          <span
            className={cn(
              "text-xs tabular-nums",
              over
                ? "text-destructive"
                : beyondIdeal
                  ? "text-warning-foreground"
                  : "text-muted-foreground",
            )}
          >
            {counter.value}/{counter.ideal ?? counter.max}
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(inputClass, "h-9", className)} {...props} />;
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(inputClass, "field-sizing-content min-h-16 py-2", className)}
      {...props}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1">
      <span>
        <span className="block text-sm">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-muted-foreground/30 transition-colors aria-checked:bg-primary motion-reduce:transition-none"
      >
        <span
          className={cn(
            "inline-block size-4 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; dot?: string }[];
  label: string;
}) {
  return (
    <fieldset className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors has-checked:bg-card has-checked:text-foreground has-checked:shadow-card has-focus-visible:ring-2 has-focus-visible:ring-ring/50 motion-reduce:transition-none"
        >
          <input
            type="radio"
            name={label}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.dot && <span className={cn("size-1.5 rounded-full", o.dot)} aria-hidden />}
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
