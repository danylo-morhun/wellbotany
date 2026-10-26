"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HeaderSearch } from "@/features/catalog/components/HeaderSearch";
import type { CategoryNav, NavLeaf } from "@/features/catalog/lib/nav";
import { headerIconClass } from "./header-icon";

type MenuLink = { label: string; href: string };

type Props = {
  navLinks: MenuLink[];
  utilityLinks: MenuLink[];
  nav: CategoryNav | null;
  showPromos: boolean;
};

const linkClass =
  "block rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary-ink";
const subLinkClass =
  "block rounded-xl py-2 pr-3.5 pl-7 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary-ink";

function LeafLinks({ leaves }: { leaves: NavLeaf[] }) {
  return (
    <>
      {leaves.map((leaf) => (
        <Link key={leaf.slug} href={leaf.href} className={subLinkClass}>
          {leaf.namePl}
        </Link>
      ))}
    </>
  );
}

export function MobileMenu({ navLinks, utilityLinks, nav, showPromos }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation
  useEffect(() => {
    if (pathname) setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger aria-label="Otwórz menu" className={`${headerIconClass} md:hidden`}>
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] overflow-y-auto p-0">
        <SheetHeader className="border-b border-border py-2 pr-3 pl-5">
          <SheetTitle>
            <Image
              src="/branding/logo-horizontal.svg"
              alt="Well Botany"
              width={177}
              height={31}
              className="h-6 w-auto dark:hidden"
            />
            <Image
              src="/branding/logo-horizontal-white.svg"
              alt="Well Botany"
              width={177}
              height={31}
              className="hidden h-6 w-auto dark:block"
            />
          </SheetTitle>
          <SheetClose aria-label="Zamknij" className={headerIconClass}>
            <X className="size-5" aria-hidden />
          </SheetClose>
        </SheetHeader>

        <div className="px-5 pt-4">
          <HeaderSearch />
        </div>

        <nav aria-label="Kategorie i sklep" className="flex flex-col gap-0.5 p-3">
          {showPromos && (
            <Link
              href="/katalog?promocje=1"
              className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-primary-ink"
            >
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Promocje
            </Link>
          )}

          {nav?.map((menu) => (
            <details key={menu.key} className="group">
              <summary
                className={`${linkClass} flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden`}
              >
                {menu.label}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-0.5 pb-1">
                {menu.sections.map((section) =>
                  section.title ? (
                    <details key={section.title} className="group/col">
                      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl py-2 pr-3.5 pl-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary-ink [&::-webkit-details-marker]:hidden">
                        {section.title}
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/col:rotate-180" />
                      </summary>
                      <div className="flex flex-col gap-0.5 pb-1">
                        {section.href && (
                          <Link href={section.href} className={subLinkClass}>
                            Wszystkie: {section.title}
                          </Link>
                        )}
                        <LeafLinks leaves={section.links} />
                      </div>
                    </details>
                  ) : (
                    <LeafLinks key={section.links[0]?.slug} leaves={section.links} />
                  ),
                )}
              </div>
            </details>
          ))}

          {nav && (
            <Link href="/marki" className={linkClass}>
              Marki
            </Link>
          )}

          <div className="my-2 border-t border-border" />

          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mx-5 border-t border-border" />

        <nav aria-label="Informacje" className="flex flex-col gap-0.5 p-3">
          {/* The header hides wishlist below sm, keep it reachable here */}
          <Link
            href="/ulubione"
            className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary-ink sm:hidden"
          >
            Ulubione
          </Link>
          {utilityLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* The header hides the theme toggle below sm, keep it reachable here */}
        <div className="mx-5 flex items-center justify-between border-t border-border py-3 pl-3.5 sm:hidden">
          <span className="text-sm font-medium text-muted-foreground">Motyw</span>
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
