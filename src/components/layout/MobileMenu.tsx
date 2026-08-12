"use client";

import { ChevronDown, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HeaderSearch } from "@/features/catalog/components/HeaderSearch";
import type { CategoryNav, NavLeaf } from "@/features/catalog/lib/nav";

type MenuLink = { label: string; href: string };

type Props = {
  navLinks: MenuLink[];
  utilityLinks: MenuLink[];
  nav: CategoryNav | null;
};

const linkClass =
  "block rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary";
const subLinkClass =
  "block rounded-xl py-2 pr-3.5 pl-7 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-primary";

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

export function MobileMenu({ navLinks, utilityLinks, nav }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation
  useEffect(() => {
    if (pathname) setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Otwórz menu"
        className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary md:hidden"
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] overflow-y-auto p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle
            render={
              <Image
                src="/branding/logo-horizontal.svg"
                alt="Well Botany"
                width={177}
                height={31}
                className="h-6 w-auto"
              />
            }
          />
        </SheetHeader>

        <div className="px-5 pt-4">
          <HeaderSearch />
        </div>

        <nav className="flex flex-col gap-0.5 p-3">
          <Link
            href="/katalog?promocje=1"
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-primary"
          >
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Promocje
          </Link>

          {nav && (
            <>
              <details className="group">
                <summary
                  className={`${linkClass} flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden`}
                >
                  {nav.supplements.namePl}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="flex flex-col gap-0.5 pb-1">
                  {nav.supplements.columns.map((col) =>
                    col.children.length > 0 ? (
                      <details key={col.slug} className="group/col">
                        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl py-2 pr-3.5 pl-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary [&::-webkit-details-marker]:hidden">
                          {col.namePl}
                          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/col:rotate-180" />
                        </summary>
                        <div className="flex flex-col gap-0.5 pb-1">
                          <LeafLinks leaves={col.children} />
                        </div>
                      </details>
                    ) : (
                      <Link key={col.slug} href={col.href} className={subLinkClass}>
                        {col.namePl}
                      </Link>
                    ),
                  )}
                </div>
              </details>

              <Link href={nav.sport.href} className={linkClass}>
                {nav.sport.namePl}
              </Link>
              <Link href={nav.kosmetyki.href} className={linkClass}>
                {nav.kosmetyki.namePl}
              </Link>

              <details className="group">
                <summary
                  className={`${linkClass} flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden`}
                >
                  {nav.zywnosc.namePl}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="flex flex-col gap-0.5 pb-1">
                  <LeafLinks leaves={nav.zywnosc.children} />
                </div>
              </details>

              <Link href="/marki" className={linkClass}>
                Marki
              </Link>
            </>
          )}

          <div className="my-2 border-t border-border" />

          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mx-5 border-t border-border" />

        <nav className="flex flex-col gap-0.5 p-3">
          {utilityLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
