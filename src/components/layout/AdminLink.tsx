"use client";

import Link from "next/link";
import { useStorefrontSession } from "@/features/session/components/StorefrontSessionProvider";

export function AdminLink() {
  const { isAdmin } = useStorefrontSession();
  if (!isAdmin) return null;

  return (
    <Link
      href="/admin/zamowienia"
      className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
    >
      Admin
    </Link>
  );
}
