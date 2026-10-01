"use client";

import { ChevronsUpDown, ExternalLink, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { confirmLeaveIfUnsaved } from "@/features/products/components/editor/useUnsavedChanges";

export function AdminUserMenu({
  name,
  email,
  logout,
}: {
  name: string;
  email: string;
  logout: () => Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-card/70 aria-expanded:bg-card/70">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-foreground">{email}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => confirmLeaveIfUnsaved() && router.push("/konto/profil")}>
          <User aria-hidden />
          Moje konto
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open("/", "_blank", "noopener")}>
          <ExternalLink aria-hidden />
          Otwórz sklep
        </DropdownMenuItem>
        <DropdownMenuItem
          destructive
          disabled={pending}
          onClick={() => {
            if (confirmLeaveIfUnsaved()) startTransition(() => logout());
          }}
        >
          <LogOut aria-hidden />
          {pending ? "Wylogowywanie…" : "Wyloguj się"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
