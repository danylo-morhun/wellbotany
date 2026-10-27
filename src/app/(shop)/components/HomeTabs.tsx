"use client";

import { type KeyboardEvent, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SeeAllLink } from "./SectionHeading";

export type HomeTab = {
  id: string;
  label: string;
  /** Server-rendered; inactive panels stay in the DOM, hidden */
  panel: React.ReactNode;
  link?: { href: string; label: string };
};

type Props = {
  tabs: HomeTab[];
  /** Accessible name of the tab list */
  label: string;
};

/** Pill tabs over server-rendered panels (WAI-ARIA tabs: arrows, Home/End, roving tabindex). */
export function HomeTabs({ tabs, label }: Props) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const link = tabs[active]?.link;

  const onKeyDown = (e: KeyboardEvent) => {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight"
        ? active === last
          ? 0
          : active + 1
        : e.key === "ArrowLeft"
          ? active === 0
            ? last
            : active - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {/* Scrolls sideways on phones instead of wrapping into a second row */}
        <div
          role="tablist"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`${baseId}-panel-${i}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none",
                i === active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-primary/15",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {link && (
          <span className="max-sm:hidden">
            <SeeAllLink href={link.href} label={link.label} />
          </span>
        )}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${i}`}
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={i !== active}
        >
          {tab.panel}
        </div>
      ))}
      {link && (
        <div className="flex justify-end sm:hidden">
          <SeeAllLink href={link.href} label={link.label} />
        </div>
      )}
    </div>
  );
}
