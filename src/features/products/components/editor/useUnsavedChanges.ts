"use client";

import { useEffect } from "react";

export const UNSAVED_MESSAGE = "Masz niezapisane zmiany. Opuścić stronę bez zapisywania?";

/** For programmatic navigation (command palette, shortcuts) that bypasses link clicks */
export function confirmLeaveIfUnsaved(): boolean {
  return document.documentElement.dataset.unsaved !== "true" || window.confirm(UNSAVED_MESSAGE);
}

/**
 * Warns before losing edits: tab close/reload (beforeunload) and in-app link
 * clicks, which Next's router would otherwise follow silently.
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    document.documentElement.dataset.unsaved = "true";
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (!window.confirm(UNSAVED_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    // Capture phase — runs before Next's <Link> handler
    document.addEventListener("click", onClick, true);
    return () => {
      delete document.documentElement.dataset.unsaved;
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}
