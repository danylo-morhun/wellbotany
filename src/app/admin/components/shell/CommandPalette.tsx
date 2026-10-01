"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  CornerDownLeft,
  ExternalLink,
  FilePlus,
  type LucideIcon,
  Package,
  PackagePlus,
  Search,
  ShoppingBag,
  User,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { adminSearch } from "@/features/admin/actions";
import { orderStatusLabel } from "@/features/orders/lib/status-labels";
import { confirmLeaveIfUnsaved } from "@/features/products/components/editor/useUnsavedChanges";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

type Command = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  image?: string | null;
  href: string;
  external?: boolean;
};

type SearchResult = NonNullable<Awaited<ReturnType<typeof adminSearch>>["data"]>;

const ACTIONS: Command[] = [
  {
    id: "new-product",
    group: "Akcje",
    label: "Dodaj produkt",
    icon: PackagePlus,
    href: "/admin/produkty/nowy",
  },
  {
    id: "new-post",
    group: "Akcje",
    label: "Nowy wpis w poradniku",
    icon: FilePlus,
    href: "/admin/poradnik/nowy",
  },
  {
    id: "to-pack",
    group: "Akcje",
    label: "Zamówienia do spakowania",
    icon: ShoppingBag,
    href: "/admin/zamowienia?widok=do-spakowania",
  },
  {
    id: "reconcile",
    group: "Akcje",
    label: "Rozlicz przelewy z wyciągu",
    icon: ShoppingBag,
    href: "/admin/zamowienia/przelewy",
  },
  {
    id: "shop",
    group: "Akcje",
    label: "Otwórz sklep",
    icon: ExternalLink,
    href: "/",
    external: true,
  },
];

const NAV_COMMANDS: Command[] = NAV_ITEMS.map((item) => ({
  id: `nav-${item.href}`,
  group: "Przejdź do",
  label: item.label,
  icon: item.icon,
  href: item.href,
  hint: item.shortcut ? `G ${item.shortcut.toUpperCase()}` : undefined,
}));

function matches(label: string, query: string) {
  return label.toLowerCase().includes(query.toLowerCase());
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const latestQuery = useRef("");
  const listRef = useRef<HTMLDivElement>(null);

  // Global shortcuts: ⌘K / Ctrl+K / "/" open the palette, "g" + key navigates
  useEffect(() => {
    let gPressedAt = 0;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "g") {
        gPressedAt = Date.now();
        return;
      }
      if (Date.now() - gPressedAt < 1000) {
        const item = NAV_ITEMS.find((i) => i.shortcut === e.key.toLowerCase());
        gPressedAt = 0;
        if (item) {
          e.preventDefault();
          if (confirmLeaveIfUnsaved()) router.push(item.href);
        }
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("admin:command-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("admin:command-palette", onOpenEvent);
    };
  }, [router]);

  const runSearch = useDebouncedCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    const res = await adminSearch({ query: q });
    // Drop responses for a query the user has already typed past
    if (latestQuery.current !== q) return;
    setResults(res?.data ?? null);
    setLoading(false);
  }, 180);

  function onQueryChange(value: string) {
    setQuery(value);
    setActive(0);
    latestQuery.current = value;
    setLoading(value.trim().length >= 2);
    runSearch(value);
  }

  const commands = useMemo<Command[]>(() => {
    const q = query.trim();
    const local = q
      ? [...ACTIONS, ...NAV_COMMANDS].filter((c) => matches(c.label, q))
      : [...ACTIONS, ...NAV_COMMANDS];
    if (!results || !q) return local;
    const remote: Command[] = [
      ...results.orders.map((o) => ({
        id: `order-${o.id}`,
        group: "Zamówienia",
        label: `${o.orderNumber} · ${o.customerName}`,
        hint: `${formatPrice(o.totalPln)} · ${orderStatusLabel(o.status, o.shippingMethod)}`,
        icon: ShoppingBag,
        href: `/admin/zamowienia/${o.id}`,
      })),
      ...results.products.map((p) => ({
        id: `product-${p.id}`,
        group: "Produkty",
        label: p.namePl,
        hint: p.brand ?? undefined,
        icon: Package,
        image: p.image,
        href: `/admin/produkty/${p.id}`,
      })),
      ...results.customers.map((c) => ({
        id: `customer-${c.email}`,
        group: "Klienci",
        label: c.name,
        hint: c.email,
        icon: User,
        href: `/admin/klienci/${encodeURIComponent(c.email)}`,
      })),
    ];
    return [...remote, ...local];
  }, [query, results]);

  const run = useCallback(
    (cmd: Command) => {
      // Programmatic close doesn't fire onOpenChange — reset the query here too
      setOpen(false);
      setQuery("");
      setResults(null);
      setActive(0);
      latestQuery.current = "";
      if (cmd.external) window.open(cmd.href, "_blank", "noopener");
      else if (confirmLeaveIfUnsaved()) router.push(cmd.href);
    },
    [router],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = commands[active];
      if (cmd) run(cmd);
    }
  }

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults(null);
      setActive(0);
      latestQuery.current = "";
    }
  }

  let lastGroup = "";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed top-[12vh] left-1/2 z-50 flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-float outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 motion-reduce:transition-none">
          <Dialog.Title className="sr-only">Wyszukaj lub przejdź</Dialog.Title>
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              // biome-ignore lint/a11y/noAutofocus: palette exists to be typed into
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Szukaj zamówień, produktów, klientów…"
              aria-label="Szukaj"
              role="combobox"
              aria-expanded
              aria-controls="admin-command-list"
              aria-activedescendant={commands[active] ? `cmd-${commands[active].id}` : undefined}
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && (
              <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground motion-reduce:animate-none" />
            )}
          </div>
          <div
            ref={listRef}
            id="admin-command-list"
            role="listbox"
            className="flex-1 overflow-y-auto p-2"
          >
            {commands.length === 0 && !loading && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">Brak wyników</p>
            )}
            {commands.map((cmd, index) => {
              const showGroup = cmd.group !== lastGroup;
              lastGroup = cmd.group;
              const Icon = cmd.icon;
              return (
                <div key={cmd.id}>
                  {showGroup && (
                    <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                      {cmd.group}
                    </p>
                  )}
                  <div
                    id={`cmd-${cmd.id}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={index === active}
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={() => run(cmd)}
                    onKeyDown={() => {}}
                    className={cn(
                      "flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm",
                      index === active && "bg-muted",
                    )}
                  >
                    {cmd.image ? (
                      <span className="relative size-6 shrink-0 overflow-hidden rounded bg-muted">
                        <Image src={cmd.image} alt="" fill sizes="24px" className="object-cover" />
                      </span>
                    ) : Icon ? (
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                    {cmd.hint && (
                      <span className="shrink-0 truncate text-xs text-muted-foreground">
                        {cmd.hint}
                      </span>
                    )}
                    {index === active && (
                      <CornerDownLeft
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> wybierz
            </span>
            <span>
              <Kbd>↵</Kbd> otwórz
            </span>
            <span>
              <Kbd>esc</Kbd> zamknij
            </span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}
