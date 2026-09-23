"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { resolveVariantId } from "../lib/variant-images";

type VariantSelection = { selectedId: string | null; select: (id: string) => void };

const VariantSelectionContext = createContext<VariantSelection | null>(null);

/**
 * Shares the chosen variant between the PDP's gallery and buy box (separate
 * layout columns). The choice is mirrored into `?wariant=` so the URL can be
 * shared, without a server round trip. `?wariant=` is read on the client so
 * the page itself stays static (canonical is the variant-less URL anyway).
 */
export function VariantSelectionProvider({
  variants,
  children,
}: {
  variants: { id: string; isDefault: boolean }[];
  children: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState(() => resolveVariantId(variants, undefined));
  useEffect(() => {
    const requested = new URL(window.location.href).searchParams.get("wariant") ?? undefined;
    setSelectedId(resolveVariantId(variants, requested));
  }, [variants]);
  const select = useCallback((id: string) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("wariant", id);
    window.history.replaceState(window.history.state, "", url);
  }, []);
  return (
    <VariantSelectionContext.Provider value={{ selectedId, select }}>
      {children}
    </VariantSelectionContext.Provider>
  );
}

/** Null outside a provider — callers keep their own local selection then. */
export function useVariantSelection(): VariantSelection | null {
  return useContext(VariantSelectionContext);
}
