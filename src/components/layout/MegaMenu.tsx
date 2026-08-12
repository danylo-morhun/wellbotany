"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { CategoryNav } from "@/features/catalog/lib/nav";
import { cn } from "@/lib/utils";

type Props = { nav: CategoryNav };

type OpenMenu = "supplements" | "zywnosc" | null;

export function MegaMenu({ nav }: Props) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <nav aria-label="Kategorie" className="hidden border-b border-border bg-card md:block">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: mouse-only hover affordance; keyboard users close the panel via Escape */}
      <div
        className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        onMouseLeave={() => setOpenMenu(null)}
      >
        <div className="flex h-11 items-center gap-7 text-sm font-medium">
          <button
            type="button"
            aria-expanded={openMenu === "supplements"}
            onMouseEnter={() => setOpenMenu("supplements")}
            onClick={() => setOpenMenu((v) => (v === "supplements" ? null : "supplements"))}
            className={cn(
              "flex items-center gap-1 transition-colors hover:text-primary",
              openMenu === "supplements" ? "text-primary" : "text-muted-foreground",
            )}
          >
            {nav.supplements.namePl}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                openMenu === "supplements" && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>

          <Link
            href={nav.sport.href}
            onMouseEnter={() => setOpenMenu(null)}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            {nav.sport.namePl}
          </Link>

          <Link
            href={nav.kosmetyki.href}
            onMouseEnter={() => setOpenMenu(null)}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            {nav.kosmetyki.namePl}
          </Link>

          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === "zywnosc"}
              onMouseEnter={() => setOpenMenu("zywnosc")}
              onClick={() => setOpenMenu((v) => (v === "zywnosc" ? null : "zywnosc"))}
              className={cn(
                "flex items-center gap-1 transition-colors hover:text-primary",
                openMenu === "zywnosc" ? "text-primary" : "text-muted-foreground",
              )}
            >
              {nav.zywnosc.namePl}
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform",
                  openMenu === "zywnosc" && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>

            {openMenu === "zywnosc" && (
              <div className="absolute top-full left-0 z-40 mt-3 min-w-48 rounded-2xl border border-border bg-card p-2 shadow-float">
                {nav.zywnosc.children.map((leaf) => (
                  <Link
                    key={leaf.slug}
                    href={leaf.href}
                    className="block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                  >
                    {leaf.namePl}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/marki"
            onMouseEnter={() => setOpenMenu(null)}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            Marki
          </Link>

          <Link
            href="/katalog?promocje=1"
            onMouseEnter={() => setOpenMenu(null)}
            className="flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-primary"
          >
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Promocje
          </Link>
        </div>

        {openMenu === "supplements" && (
          <div className="absolute inset-x-0 top-full z-40 rounded-b-2xl border-t border-border bg-card shadow-float">
            <div className="columns-2 gap-x-8 px-4 py-6 sm:columns-3 sm:px-6 lg:columns-4 lg:px-8">
              {nav.supplements.columns.map((col) => (
                <div key={col.slug} className="mb-6 break-inside-avoid">
                  <Link
                    href={col.href}
                    className="block text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {col.namePl}
                  </Link>
                  {col.children.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {col.children.map((leaf) => (
                        <li key={leaf.slug}>
                          <Link
                            href={leaf.href}
                            className="text-sm text-muted-foreground transition-colors hover:text-primary"
                          >
                            {leaf.namePl}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
