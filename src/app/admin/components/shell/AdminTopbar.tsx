"use client";

import { ExternalLink, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AdminSidebarNav } from "./AdminSidebar";
import { Kbd } from "./CommandPalette";
import { NewMenu } from "./NewMenu";
import type { NavBadges } from "./nav";

export function AdminTopbar({
  badges,
  userMenu,
}: {
  badges: NavBadges;
  userMenu: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:rounded-t-2xl print:hidden">
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="-ml-1 flex size-9 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
        aria-label="Otwórz menu"
      >
        <Menu className="size-5" />
      </button>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-3">
          <SheetTitle className="mb-4 px-2.5 pt-2 font-heading text-lg font-semibold">
            Well Botany
          </SheetTitle>
          <AdminSidebarNav badges={badges} onNavigate={() => setMenuOpen(false)} />
          <div className="mt-6 border-t border-border pt-3">{userMenu}</div>
        </SheetContent>
      </Sheet>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("admin:command-palette"))}
        className="flex h-9 w-full min-w-0 max-w-md items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-ring/40 motion-reduce:transition-none"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 truncate text-left">Szukaj zamówień, produktów, klientów…</span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <NewMenu />
        <Link
          href="/"
          target="_blank"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <span className="hidden sm:inline">Sklep</span>
          <ExternalLink className="size-4" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
