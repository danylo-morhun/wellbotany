"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getStorefrontSession, type StorefrontSession } from "../actions";

const EMPTY_SESSION: StorefrontSession = { isAdmin: false, cartItems: [], wishlistItems: [] };

type StorefrontSessionContextValue = {
  session: StorefrontSession;
  refresh: () => Promise<void>;
};

const StorefrontSessionContext = createContext<StorefrontSessionContextValue | null>(null);

export function StorefrontSessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState(EMPTY_SESSION);
  // Only the latest request may write — an older, slower response would
  // otherwise overwrite fresher state after rapid add/remove clicks.
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const next = await getStorefrontSession();
      if (request === latestRequest.current) setSession(next);
    } catch {
      // Keep the last known state; the next navigation retries
    }
  }, []);

  // Re-read on every navigation: login/logout, checkout and merges change
  // the cart without going through a storefront button.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  return (
    <StorefrontSessionContext.Provider value={{ session, refresh }}>
      {children}
    </StorefrontSessionContext.Provider>
  );
}

export function useStorefrontSession(): StorefrontSession {
  return useContext(StorefrontSessionContext)?.session ?? EMPTY_SESSION;
}

/** Re-reads the header state and the current route after a cart/wishlist mutation. */
export function useRefreshStorefront(): () => Promise<void> {
  const router = useRouter();
  const context = useContext(StorefrontSessionContext);
  return useCallback(async () => {
    router.refresh();
    await context?.refresh();
  }, [router, context]);
}
