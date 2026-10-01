"use client";

import { FilePlus, PackagePlus, Plus, TicketPercent } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { confirmLeaveIfUnsaved } from "@/features/products/components/editor/useUnsavedChanges";

const ITEMS = [
  { href: "/admin/produkty/nowy", label: "Produkt", icon: PackagePlus },
  { href: "/admin/kupony?nowy=1", label: "Kod rabatowy", icon: TicketPercent },
  { href: "/admin/poradnik/nowy", label: "Wpis w poradniku", icon: FilePlus },
];

export function NewMenu() {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary-deep">
        <Plus className="size-4" aria-hidden />
        <span className="hidden sm:inline">Nowy</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} onClick={() => confirmLeaveIfUnsaved() && router.push(href)}>
            <Icon aria-hidden />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
