"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useRef } from "react";
import { flushSync } from "react-dom";
import { inputClass } from "./fields";

/** Ordered list of short strings: one input per item, Enter adds the next one */
export function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  max,
  maxLength,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel: string;
  max?: number;
  maxLength?: number;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  // Render synchronously, then focus — otherwise fast typing after Enter lands in the old row
  function focusRow(i: number) {
    listRef.current?.querySelectorAll("input")[i]?.focus();
  }
  function update(i: number, value: string) {
    onChange(items.map((it, j) => (j === i ? value : it)));
  }
  function add(at = items.length) {
    if (max && items.length >= max) return;
    flushSync(() => onChange([...items.slice(0, at), "", ...items.slice(at)]));
    focusRow(at);
  }
  function remove(i: number) {
    flushSync(() => onChange(items.filter((_, j) => j !== i)));
    focusRow(Math.max(0, i - 1));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      {items.length > 0 && (
        <ol ref={listRef} className="mb-2 space-y-1.5">
          {items.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional; content is being edited
            <li key={i} className="group flex items-center gap-1.5">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {i + 1}.
              </span>
              <input
                value={item}
                maxLength={maxLength}
                placeholder={placeholder}
                onChange={(e) => update(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(i + 1);
                  } else if (e.key === "Backspace" && item === "" && items.length > 0) {
                    e.preventDefault();
                    remove(i);
                  }
                }}
                className={`${inputClass} h-9`}
              />
              <div className="flex shrink-0 opacity-40 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <IconBtn label="W górę" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ArrowUp />
                </IconBtn>
                <IconBtn label="W dół" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                  <ArrowDown />
                </IconBtn>
                <IconBtn label="Usuń" onClick={() => remove(i)}>
                  <X />
                </IconBtn>
              </div>
            </li>
          ))}
        </ol>
      )}
      {(!max || items.length < max) && (
        <button
          type="button"
          onClick={() => add()}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary hover:bg-secondary"
        >
          <Plus className="size-4" aria-hidden />
          {addLabel}
        </button>
      )}
    </div>
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
