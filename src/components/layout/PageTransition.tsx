"use client";

import { usePathname } from "next/navigation";
import { useEffect, ViewTransition } from "react";

const CHECKOUT = "/zamowienie";
// Longer than the slowest page transition, so the flag outlives it
const TRANSITION_MS = 600;

/**
 * Route change = view transition: the old page fades out fast while the new
 * one rises in on the spring. Keyed on pathname only, so filter/sort/page
 * query changes stay in place (the product grid crossfades on its own).
 *
 * Skipped (html[data-vt-off], see globals.css) when it would get in the way:
 * - browser back/forward: returning should be instant, and Safari's swipe-back
 *   already draws its own animation;
 * - into, inside and out of checkout: speed and a calm form matter more there.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const skip = () => {
      root.dataset.vtOff = "";
      // Safety net if no navigation follows (e.g. cmd-click opened a new tab)
      setTimeout(() => {
        if (location.pathname !== CHECKOUT) delete root.dataset.vtOff;
      }, 3000);
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (link instanceof HTMLAnchorElement && new URL(link.href).pathname === CHECKOUT) skip();
    };
    window.addEventListener("popstate", skip);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("popstate", skip);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // After each route change: stay off inside checkout (so leaving it is
  // instant too), otherwise re-enable once this transition has finished
  useEffect(() => {
    const root = document.documentElement;
    if (pathname === CHECKOUT) {
      root.dataset.vtOff = "";
      return;
    }
    const t = setTimeout(() => {
      delete root.dataset.vtOff;
    }, TRANSITION_MS);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">
      {/* One box = one snapshot; bare children would be captured section by section */}
      <div>{children}</div>
    </ViewTransition>
  );
}
