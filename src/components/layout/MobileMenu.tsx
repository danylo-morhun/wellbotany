"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HeaderSearch } from "@/features/catalog/components/HeaderSearch";

type MenuLink = { label: string; href: string };

type Props = {
  navLinks: MenuLink[];
  utilityLinks: MenuLink[];
};

export function MobileMenu({ navLinks, utilityLinks }: Props) {
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
          <SheetTitle className="font-heading text-base font-bold tracking-tight">
            Well Botany
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 pt-4">
          <HeaderSearch />
        </div>

        <nav className="flex flex-col gap-0.5 p-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/katalog?promocje=1"
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-primary"
          >
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Promocje
          </Link>
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
