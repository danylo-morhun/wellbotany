"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "./fields";

/** Free-form tags: Enter or comma adds a chip, Backspace on empty removes the last */
export function ChipsInput({
  id,
  values,
  onChange,
  placeholder,
  suggestions = [],
  max,
}: {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = [...values];
    for (const p of parts) {
      if (max && next.length >= max) break;
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next);
    setDraft("");
  }

  const openSuggestions = suggestions.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div>
      <div
        className={cn(
          inputClass,
          "flex min-h-9 flex-wrap items-center gap-1.5 px-1.5 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15",
        )}
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary pr-1 pl-2 text-xs font-medium text-secondary-foreground"
          >
            {v}
            <button
              type="button"
              aria-label={`Usuń ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="flex size-4 items-center justify-center rounded hover:bg-foreground/10"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={values.length ? "" : placeholder}
          onChange={(e) => {
            if (e.target.value.includes(",")) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft.trim()) add(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          className="h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      {openSuggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {openSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="h-6 rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
