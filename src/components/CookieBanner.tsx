"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type ConsentChoice,
  OPEN_COOKIE_SETTINGS_EVENT,
  readConsent,
  saveConsent,
} from "@/lib/analytics";

export function CookieBanner() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAdmin && !readConsent()) setVisible(true);
  }, [isAdmin]);

  // "Ustawienia cookies" in the footer reopens the banner to change the choice
  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("has-cookie-banner", visible);
    return () => document.body.classList.remove("has-cookie-banner");
  }, [visible]);

  function respond(choice: ConsentChoice) {
    saveConsent(choice);
    setVisible(false);
  }

  if (isAdmin || !visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-label="Zgoda na pliki cookie"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl bg-foreground p-4 text-background shadow-float sm:flex-row sm:items-center sm:justify-between print:hidden"
    >
      <p className="text-sm">
        Używamy niezbędnych plików cookie do działania sklepu (koszyk, logowanie). Za Twoją zgodą
        użyjemy też cookie analitycznych Google Analytics, by sprawdzać, jak korzystasz ze sklepu.
        Zgodę możesz zmienić w każdej chwili. Więcej w{" "}
        <Link href="/cookies" className="underline">
          polityce cookies
        </Link>
        .
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => respond("rejected")}
          className="rounded-lg border border-background/40 px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Tylko niezbędne
        </button>
        <button
          type="button"
          onClick={() => respond("accepted")}
          className="rounded-lg bg-background px-4 py-2 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
        >
          Akceptuję
        </button>
      </div>
    </div>
  );
}
