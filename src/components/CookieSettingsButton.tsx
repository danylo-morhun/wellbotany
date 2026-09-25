"use client";

import { OPEN_COOKIE_SETTINGS_EVENT } from "@/lib/analytics";

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
      className={className}
    >
      Ustawienia cookies
    </button>
  );
}
