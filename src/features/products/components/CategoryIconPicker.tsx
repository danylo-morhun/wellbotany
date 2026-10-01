"use client";

import { CATEGORY_ICONS, getCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import { inputClass } from "./editor/fields";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}

export function CategoryIconPicker({ id, value, onChange }: Props) {
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
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "h-9")}
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
