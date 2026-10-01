"use client";

import { Plus, Table2, X } from "lucide-react";
import { useState } from "react";
import type { NutritionRow } from "../../lib/nutrition-facts";
import { inputClass, TextArea } from "./fields";

export type NutritionState =
  | { mode: "rows"; rows: NutritionRow[] }
  | { mode: "text"; text: string };

/** Best-effort split of a pasted label line: "Witamina C | 80 mg | 100%", tabs, or "Witamina C 80 mg 100%" */
function splitLine(line: string): NutritionRow {
  const parts = line.split(/\s*[|\t;]\s*/).filter(Boolean);
  if (parts.length >= 2) return { name: parts[0], amount: parts[1], rws: parts[2] };
  const m = line.match(
    /^(.*?)\s+(\d[\d.,]*\s*(?:mg|µg|μg|mcg|g|IU|j\.m\.|ml|kcal|kJ|CFU|jtk)[^\s]*)\s*(\d[\d.,]*\s*%)?$/i,
  );
  if (m) return { name: m[1], amount: m[2], rws: m[3] };
  return { name: line, amount: "" };
}

export function NutritionEditor({
  value,
  onChange,
}: {
  value: NutritionState;
  onChange: (v: NutritionState) => void;
}) {
  const [pasting, setPasting] = useState(false);
  const [paste, setPaste] = useState("");
  if (value.mode === "text") {
    return (
      <div className="space-y-2">
        <div className="rounded-lg bg-warning/15 px-3 py-2 text-xs">
          Tabela z importu zapisana jako tekst — sklep pokaże ją bez zmian. Przekształć ją w tabelę,
          żeby składniki linkowały do słowniczka.
        </div>
        <TextArea
          aria-label="Wartości odżywcze (tekst)"
          value={value.text}
          onChange={(e) => onChange({ mode: "text", text: e.target.value })}
          className="font-mono text-xs"
        />
        <button
          type="button"
          onClick={() =>
            onChange({
              mode: "rows",
              rows: value.text
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean)
                .map(splitLine),
            })
          }
          className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium hover:bg-muted"
        >
          <Table2 className="size-4" aria-hidden />
          Przekształć w tabelę
        </button>
      </div>
    );
  }

  const rows = value.rows;
  const set = (next: NutritionRow[]) => onChange({ mode: "rows", rows: next });
  const update = (i: number, patch: Partial<NutritionRow>) =>
    set(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div>
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_8rem_5rem_2rem] gap-px bg-muted px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="px-1">Składnik</span>
            <span className="px-1">Na porcję</span>
            <span className="px-1">%RWS</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: positional rows under edit
              key={i}
              className="grid grid-cols-[1fr_8rem_5rem_2rem] items-center gap-1.5 border-t border-border px-2 py-1.5"
            >
              <input
                aria-label="Składnik"
                value={r.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Witamina C"
                className={`${inputClass} h-8`}
              />
              <input
                aria-label="Dawka na porcję"
                value={r.amount}
                aria-invalid={!r.amount.trim() && !!r.name.trim()}
                onChange={(e) => update(i, { amount: e.target.value })}
                placeholder="80 mg"
                className={`${inputClass} h-8`}
              />
              <input
                aria-label="%RWS"
                value={r.rws ?? ""}
                onChange={(e) => update(i, { rws: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    set([...rows, { name: "", amount: "" }]);
                  }
                }}
                placeholder="100%"
                className={`${inputClass} h-8`}
              />
              <button
                type="button"
                aria-label="Usuń wiersz"
                onClick={() => set(rows.filter((_, j) => j !== i))}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => set([...rows, { name: "", amount: "" }])}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary hover:bg-secondary"
        >
          <Plus className="size-4" aria-hidden />
          Dodaj składnik
        </button>
        <button
          type="button"
          onClick={() => setPasting((p) => !p)}
          aria-expanded={pasting}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Wklej z etykiety…
        </button>
      </div>
      {pasting && (
        <div className="mt-2 space-y-2 rounded-lg bg-muted/60 p-3">
          <TextArea
            autoFocus
            aria-label="Tabela z etykiety"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"Witamina C 80 mg 100%\nCynk | 10 mg | 100%"}
            className="font-mono text-xs"
          />
          <button
            type="button"
            disabled={!paste.trim()}
            onClick={() => {
              set([
                ...rows.filter((r) => r.name.trim()),
                ...paste
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map(splitLine),
              ]);
              setPaste("");
              setPasting(false);
            }}
            className="flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Dodaj do tabeli
          </button>
        </div>
      )}
    </div>
  );
}
