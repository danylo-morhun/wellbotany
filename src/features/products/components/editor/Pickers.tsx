"use client";

import { Popover } from "@base-ui/react/popover";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { inputClass } from "./fields";

export type PickerOption = { id: string; label: string; group?: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l");

/** Searchable, grouped option list with keyboard navigation — shared by single and multi pickers */
function OptionList({
  options,
  selected,
  onPick,
  onCreate,
  createLabel,
  placeholder,
  searchRef,
  emptyHint,
}: {
  searchRef: React.RefObject<HTMLInputElement | null>;
  emptyHint?: string;
  options: PickerOption[];
  selected: Set<string>;
  onPick: (id: string) => void;
  onCreate?: (name: string) => void;
  createLabel?: string;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return q ? options.filter((o) => norm(o.label).includes(q)) : options;
  }, [options, query]);
  const canCreate =
    onCreate && query.trim() && !options.some((o) => norm(o.label) === norm(query.trim()));
  const total = filtered.length + (canCreate ? 1 : 0);

  function choose(i: number) {
    if (i < filtered.length) onPick(filtered[i].id);
    else if (canCreate) onCreate?.(query.trim());
  }

  let lastGroup: string | undefined;
  return (
    <div className="flex max-h-80 w-72 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={searchRef}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, total - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(active);
            }
            requestAnimationFrame(() =>
              listRef.current
                ?.querySelector('[data-active="true"]')
                ?.scrollIntoView({ block: "nearest" }),
            );
          }}
          className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div ref={listRef} role="listbox" className="flex-1 overflow-y-auto p-1">
        {filtered.map((o, i) => {
          const showGroup = o.group && o.group !== lastGroup;
          lastGroup = o.group;
          return (
            <div key={o.id}>
              {showGroup && (
                <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                  {o.group}
                </p>
              )}
              <button
                type="button"
                role="option"
                aria-selected={selected.has(o.id)}
                data-active={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(i)}
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm data-[active=true]:bg-muted"
              >
                <Check
                  className={cn("size-4 shrink-0 text-primary", !selected.has(o.id) && "invisible")}
                  aria-hidden
                />
                <span className="truncate">{o.label}</span>
              </button>
            </div>
          );
        })}
        {canCreate && (
          <button
            type="button"
            data-active={active === filtered.length}
            onMouseMove={() => setActive(filtered.length)}
            onClick={() => choose(filtered.length)}
            className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-primary data-[active=true]:bg-secondary"
          >
            <Plus className="size-4" aria-hidden />
            {createLabel} „{query.trim()}”
          </button>
        )}
        {total === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {options.length === 0 && emptyHint ? emptyHint : "Brak wyników"}
          </p>
        )}
      </div>
    </div>
  );
}

function PickerPopup({
  children,
  searchRef,
}: {
  children: React.ReactNode;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <Popover.Portal>
      <Popover.Positioner align="start" sideOffset={4} className="z-50">
        <Popover.Popup
          // Focus the search box on open so typing works immediately
          initialFocus={searchRef}
          className="rounded-xl bg-popover text-popover-foreground shadow-float outline-none transition-[opacity,transform] duration-100 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none"
        >
          {children}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
}

export function SearchSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  onCreate,
  createLabel,
}: {
  id?: string;
  value: string;
  onChange: (id: string) => void;
  options: PickerOption[];
  placeholder: string;
  searchPlaceholder: string;
  onCreate?: (name: string) => void;
  createLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = options.find((o) => o.id === value);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="flex gap-1.5">
        <Popover.Trigger
          id={id}
          className={cn(
            inputClass,
            "flex h-9 items-center justify-between gap-2 text-left",
            !current && "text-muted-foreground",
          )}
        >
          <span className="truncate">{current?.label ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Popover.Trigger>
        {current && (
          <button
            type="button"
            aria-label="Wyczyść"
            onClick={() => onChange("")}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <PickerPopup searchRef={searchRef}>
        <OptionList
          searchRef={searchRef}
          options={options}
          selected={new Set(value ? [value] : [])}
          placeholder={searchPlaceholder}
          createLabel={createLabel}
          onCreate={
            onCreate &&
            ((name) => {
              onCreate(name);
              setOpen(false);
            })
          }
          onPick={(picked) => {
            onChange(picked);
            setOpen(false);
          }}
        />
      </PickerPopup>
    </Popover.Root>
  );
}

export function MultiPicker({
  values,
  onChange,
  options,
  addLabel,
  searchPlaceholder,
  emptyText,
  emptyHint,
}: {
  emptyHint?: string;
  values: string[];
  onChange: (ids: string[]) => void;
  options: PickerOption[];
  addLabel: string;
  searchPlaceholder: string;
  emptyText?: string;
}) {
  const byId = new Map(options.map((o) => [o.id, o]));
  const selected = new Set(values);
  const searchRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((id) => (
          <span
            key={id}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-secondary pr-1 pl-2.5 text-sm text-secondary-foreground"
          >
            {byId.get(id)?.label ?? "?"}
            <button
              type="button"
              aria-label={`Usuń ${byId.get(id)?.label ?? ""}`}
              onClick={() => onChange(values.filter((v) => v !== id))}
              className="flex size-5 items-center justify-center rounded hover:bg-foreground/10"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        {values.length === 0 && emptyText && (
          <p className="py-1 text-sm text-muted-foreground">{emptyText}</p>
        )}
      </div>
      <Popover.Root>
        <Popover.Trigger className="mt-2 flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary hover:bg-secondary">
          <Plus className="size-4" aria-hidden />
          {addLabel}
        </Popover.Trigger>
        <PickerPopup searchRef={searchRef}>
          <OptionList
            searchRef={searchRef}
            emptyHint={emptyHint}
            options={options}
            selected={selected}
            placeholder={searchPlaceholder}
            onPick={(id) =>
              onChange(selected.has(id) ? values.filter((v) => v !== id) : [...values, id])
            }
          />
        </PickerPopup>
      </Popover.Root>
    </div>
  );
}
