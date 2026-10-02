"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  heading: React.ReactNode;
  labels: string[];
  panels: React.ReactNode[];
};

export function ShelfTabs({ heading, labels, panels }: Props) {
  const [active, setActive] = useState(0);
  const id = useId();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {heading}
        <div role="tablist" className="flex gap-1 rounded-full bg-muted p-1">
          {labels.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              id={`${id}-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`${id}-panel-${i}`}
              onClick={() => setActive(i)}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none",
                i === active
                  ? "bg-card text-primary-deep shadow-card"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {panels.map((panel, i) => (
        <div
          key={labels[i]}
          role="tabpanel"
          id={`${id}-panel-${i}`}
          aria-labelledby={`${id}-tab-${i}`}
          hidden={i !== active}
        >
          {panel}
        </div>
      ))}
    </>
  );
}
