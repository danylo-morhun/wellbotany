"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { BrandItem } from "@/features/catalog/actions";

/** Two independent click zones for a brand with product lines (e.g. Formeds): the name navigates to its combined listing, the chevron expands the line list in place — so it can't be one big `<Link>` like a leaf brand's row. Links go to the full catalog pre-filtered by this brand (not the dedicated `/marki/[slug]` landing page) — that page stays static/SEO-only, so browsing further there (e.g. picking a different brand) wouldn't leave its header and URL stuck on the wrong name. */
export function BrandRow({ brand }: { brand: BrandItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasLines = brand.subBrands.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1 py-5">
        <Link
          href={`/katalog?marka=${brand.slug}`}
          className="group flex min-w-0 flex-1 items-center justify-between gap-4 transition-colors duration-200 ease-out motion-reduce:transition-none"
        >
          <span className="text-xl font-semibold text-foreground transition-colors duration-200 ease-out group-hover:text-primary md:text-2xl motion-reduce:transition-none">
            {brand.name}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            {brand._count.products} produktów
            <ArrowUpRight
              className="size-4 -translate-x-1 opacity-0 transition-[transform,opacity] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </span>
        </Link>
        {hasLines && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? `Zwiń linie ${brand.name}` : `Rozwiń linie ${brand.name}`}
            className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground motion-reduce:transition-none"
          >
            <ChevronDown
              className={`size-5 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>
      {hasLines && expanded && (
        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-0.5 sm:grid-cols-3">
          {brand.subBrands.map((line) => (
            <Link
              key={line.id}
              href={`/katalog?marka=${line.slug}`}
              className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground motion-reduce:transition-none"
            >
              <span>{line.name}</span>
              <span className="text-xs tabular-nums opacity-60">{line._count.products}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
