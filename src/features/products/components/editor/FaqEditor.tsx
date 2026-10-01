"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import type { FaqRow } from "@/lib/faq-text";
import { TextArea, TextInput } from "./fields";

const MAX_ROWS = 20;

/** Question/answer pairs — the shape the faqPl JSON columns store. */
export function FaqEditor({
  value,
  onChange,
}: {
  value: FaqRow[];
  onChange: (rows: FaqRow[]) => void;
}) {
  function update(i: number, patch: Partial<FaqRow>) {
    onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <>
      {value.length > 0 && (
        <ol className="space-y-3">
          {value.map((row, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: positional rows under edit
            <li key={i} className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Pytanie {i + 1}</span>
                <div className="ml-auto flex">
                  <IconBtn label="W górę" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </IconBtn>
                  <IconBtn
                    label="W dół"
                    disabled={i === value.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown />
                  </IconBtn>
                  <IconBtn
                    label="Usuń pytanie"
                    onClick={() => onChange(value.filter((_, j) => j !== i))}
                  >
                    <X />
                  </IconBtn>
                </div>
              </div>
              <TextInput
                aria-label={`Pytanie ${i + 1}`}
                value={row.q}
                placeholder="Pytanie"
                onChange={(e) => update(i, { q: e.target.value })}
                className="font-medium"
              />
              <TextArea
                aria-label={`Odpowiedź ${i + 1}`}
                value={row.a}
                placeholder="Odpowiedź"
                onChange={(e) => update(i, { a: e.target.value })}
                className="mt-2"
              />
            </li>
          ))}
        </ol>
      )}
      {value.length < MAX_ROWS && (
        <button
          type="button"
          onClick={() => onChange([...value, { q: "", a: "" }])}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary hover:bg-secondary"
        >
          <Plus className="size-4" aria-hidden />
          Dodaj pytanie
        </button>
      )}
    </>
  );
}

function IconBtn({
  label,
  children,
  ...props
}: { label: string; children: React.ReactNode } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 [&_svg]:size-3.5"
      {...props}
    >
      {children}
    </button>
  );
}
