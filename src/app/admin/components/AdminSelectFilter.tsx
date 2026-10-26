"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputClass } from "@/features/products/components/editor/fields";
import { cn } from "@/lib/utils";

type Props = {
  param: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
};

/** URL-backed select filter; resets pagination on change */
export function AdminSelectFilter({ param, label, allLabel, options }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(param, value);
    else params.delete(param);
    params.delete("strona");
    router.replace(`${pathname}?${params.toString()}`);
  }

  const value = searchParams.get(param) ?? "";

  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-active={value ? true : undefined}
      className={cn(
        inputClass,
        "h-9 w-auto max-w-[220px] truncate bg-card px-2.5 data-active:border-primary/40 data-active:bg-secondary/60",
      )}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
