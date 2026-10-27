"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** The order form only — the confirmation page keeps the full store chrome. */
export function isCheckoutPath(pathname: string | null): boolean {
  return pathname === "/zamowienie";
}

/**
 * Renders `checkout` on the order form and `children` everywhere else. Client
 * side so the swap also happens on soft navigation (cart → checkout), where the
 * shared shop layout doesn't re-render.
 */
export function CheckoutChrome({
  checkout,
  children,
}: {
  checkout: ReactNode;
  children: ReactNode;
}) {
  return isCheckoutPath(usePathname()) ? checkout : children;
}
