"use client";

import { CATEGORY_ICONS, getCategoryIcon } from "@/lib/category-icons";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryIconPicker({ value, onChange }: Props) {
  const Icon = getCategoryIcon(value);

  return (
    <div className="flex items-center gap-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        {Icon ? (
          <Icon className="size-4" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      <select
        name="icon"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border px-2 py-1 text-sm"
      >
        <option value="">Brak ikony</option>
        {CATEGORY_ICONS.map((opt) => (
          <option key={opt.name} value={opt.name}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
