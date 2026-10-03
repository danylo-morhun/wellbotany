"use client";

import { ArrowRight, ChevronDown, Gift } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import type { CategoryNav, NavMenu, NavSection } from "@/features/catalog/lib/nav";
import { cn } from "@/lib/utils";

type Props = { nav: CategoryNav; showPromos: boolean };

// One look for every tab — the special links differ only by a small marker
const tabClass = "flex h-11 items-center gap-1.5 transition-colors hover:text-primary";

const headingClass = "text-sm font-semibold text-foreground transition-colors hover:text-primary";
const linkClass = "text-sm text-muted-foreground transition-colors hover:text-primary";

/** Supplement types: bold group heading, links under it. */
function GroupsBody({ sections }: { sections: NavSection[] }) {
  return (
    <div className="columns-2 gap-x-8 sm:columns-3 lg:columns-4">
      {sections.map((section) => (
        <div key={section.title} className="mb-6 break-inside-avoid">
          {section.href ? (
            <Link href={section.href} className={cn(headingClass, "block")}>
              {section.title}
            </Link>
          ) : (
            <p className="text-sm font-semibold text-foreground">{section.title}</p>
          )}
          {section.links.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {section.links.map((leaf) => (
                <li key={leaf.slug}>
                  <Link href={leaf.href} className={linkClass}>
                    {leaf.namePl}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/** Flat menus: top-level links in columns, titled sections ("Dla kogo", "Więcej") in a tinted side column. */
function ListBody({ sections, footer }: { sections: NavSection[]; footer: ReactNode }) {
  const main = sections.filter((s) => !s.title).flatMap((s) => s.links);
  const side = sections.filter((s) => s.title);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
      {/* Footer sits under the links, not under the taller side column */}
      <div className="flex flex-col">
        <ul className="grid content-start gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {main.map((leaf) => (
            <li key={leaf.slug}>
              <Link
                href={leaf.href}
                className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                {leaf.namePl}
              </Link>
            </li>
          ))}
        </ul>
        {footer}
      </div>
      {side.map((section) => (
        <div key={section.title} className="self-start rounded-2xl bg-secondary/60 p-4">
          <p className="text-sm font-semibold text-foreground">{section.title}</p>
          <ul className="mt-2 space-y-1.5">
            {section.links.map((leaf) => (
              <li key={leaf.slug}>
                <Link href={leaf.href} className={linkClass}>
                  {leaf.namePl}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** One shell for every menu: full-width panel, same padding, "see all" link at the bottom. */
function MenuPanel({ menu }: { menu: NavMenu }) {
  const footer = (
    <Link
      href={menu.href}
      className="group mt-5 inline-flex items-center gap-1 self-start text-sm font-semibold text-primary hover:underline"
    >
      {menu.seeAllLabel}
      <ArrowRight
        className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
  );
  return (
    <div className="absolute inset-x-0 top-full z-40 rounded-b-2xl border-t border-border bg-card shadow-float">
      <div className="flex flex-col px-4 py-6 sm:px-6 lg:px-8">
        {menu.layout === "groups" ? (
          <>
            <GroupsBody sections={menu.sections} />
            {footer}
          </>
        ) : (
          <ListBody sections={menu.sections} footer={footer} />
        )}
      </div>
    </div>
  );
}

export function MegaMenu({ nav, showPromos }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
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
        <div className="flex h-11 items-center gap-5 whitespace-nowrap text-sm font-medium lg:gap-7">
          {nav.map((menu) => (
            <div key={menu.key}>
              <button
                type="button"
                aria-expanded={openMenu === menu.key}
                onMouseEnter={() => setOpenMenu(menu.key)}
                onClick={() => setOpenMenu((v) => (v === menu.key ? null : menu.key))}
                className={cn(
                  tabClass,
                  "gap-1",
                  openMenu === menu.key ? "text-primary" : "text-foreground",
                )}
              >
                {menu.label}
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    openMenu === menu.key && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>
          ))}

          <Link
            href="/marki"
            onMouseEnter={() => setOpenMenu(null)}
            className={cn(tabClass, "text-foreground")}
          >
            Marki
          </Link>

          <Link
            href="/zestawy-prezentowe"
            onMouseEnter={() => setOpenMenu(null)}
            // Pushed right with Promocje: shopping occasions, not categories
            className={cn(tabClass, "ml-auto text-foreground")}
          >
            <Gift className="size-4 text-primary" aria-hidden />
            {/* Full label wraps the row on tablets */}
            <span className="lg:hidden">Prezenty</span>
            <span className="hidden lg:inline">Zestawy prezentowe</span>
          </Link>

          {showPromos && (
            <Link
              href="/katalog?promocje=1"
              onMouseEnter={() => setOpenMenu(null)}
              className={cn(tabClass, "text-foreground")}
            >
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Promocje
            </Link>
          )}
        </div>

        {nav.map((menu) => openMenu === menu.key && <MenuPanel key={menu.key} menu={menu} />)}
      </div>
    </nav>
  );
}
