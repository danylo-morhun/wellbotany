"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { CategoryNav, NavMenu, NavSection } from "@/features/catalog/lib/nav";
import { cn } from "@/lib/utils";

type Props = { nav: CategoryNav };

const leafClass = "text-sm text-muted-foreground transition-colors hover:text-primary";

function SectionBlock({ section }: { section: NavSection }) {
  // Untitled: each link flows through the panel's columns on its own
  if (!section.title) {
    return section.links.map((leaf) => (
      <Link
        key={leaf.slug}
        href={leaf.href}
        className={cn(leafClass, "mb-2 block break-inside-avoid")}
      >
        {leaf.namePl}
      </Link>
    ));
  }
  return (
    <div className="mb-6 break-inside-avoid">
      {section.href ? (
        <Link
          href={section.href}
          className="block text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          {section.title}
        </Link>
      ) : (
        <p className="text-sm font-semibold text-foreground">{section.title}</p>
      )}
      {section.links.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {section.links.map((leaf) => (
            <li key={leaf.slug}>
              <Link href={leaf.href} className={leafClass}>
                {leaf.namePl}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MenuPanel({ menu }: { menu: NavMenu }) {
  if (menu.wide) {
    return (
      <div className="absolute inset-x-0 top-full z-40 rounded-b-2xl border-t border-border bg-card shadow-float">
        <div className="columns-2 gap-x-8 px-4 py-6 sm:columns-3 sm:px-6 lg:columns-4 lg:px-8">
          {menu.sections.map((section) => (
            <SectionBlock key={section.title ?? section.links[0]?.slug} section={section} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="absolute top-full left-0 z-40 mt-3 min-w-48 rounded-2xl border border-border bg-card p-2 shadow-float">
      {menu.sections.map((section) => (
        <div key={section.title ?? section.links[0]?.slug}>
          {section.title && (
            <p className="px-3 pt-2 pb-1 text-xs font-semibold text-foreground">{section.title}</p>
          )}
          {section.links.map((leaf) => (
            <Link
              key={leaf.slug}
              href={leaf.href}
              className="block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
            >
              {leaf.namePl}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

export function MegaMenu({ nav }: Props) {
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
        <div className="flex h-11 items-center gap-7 text-sm font-medium">
          {nav.map((menu) => (
            <div key={menu.key} className={menu.wide ? undefined : "relative"}>
              <button
                type="button"
                aria-expanded={openMenu === menu.key}
                onMouseEnter={() => setOpenMenu(menu.key)}
                onClick={() => setOpenMenu((v) => (v === menu.key ? null : menu.key))}
                className={cn(
                  "flex items-center gap-1 transition-colors hover:text-primary",
                  openMenu === menu.key ? "text-primary" : "text-muted-foreground",
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
              {!menu.wide && openMenu === menu.key && <MenuPanel menu={menu} />}
            </div>
          ))}

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

        {nav.map(
          (menu) => menu.wide && openMenu === menu.key && <MenuPanel key={menu.key} menu={menu} />,
        )}
      </div>
    </nav>
  );
}
