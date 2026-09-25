"use client";

import { SquarePen } from "lucide-react";
import Link from "next/link";
import { useStorefrontSession } from "@/features/session/components/StorefrontSessionProvider";

type Props = {
  productId: string;
};

/** Floating "Edytuj" shortcut shown only to logged-in admins viewing the storefront PDP. */
export function AdminEditBar({ productId }: Props) {
  const { isAdmin } = useStorefrontSession();
  if (!isAdmin) return null;

  return (
    <Link
      href={`/admin/produkty/${productId}`}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-float transition-opacity hover:opacity-90"
    >
      <SquarePen className="size-4" />
      Edytuj produkt
    </Link>
  );
}
