"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("has-cookie-banner", visible);
    return () => document.body.classList.remove("has-cookie-banner");
  }, [visible]);

  function respond(choice: "accepted" | "rejected") {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-label="Zgoda na pliki cookie"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl bg-foreground p-4 text-background shadow-float sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm">
        Używamy plików cookie wyłącznie do działania sklepu — koszyka, sesji logowania i Twoich
        preferencji. Więcej w{" "}
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
          Odrzuć opcjonalne
        </button>
        <button
          type="button"
          onClick={() => respond("accepted")}
          className="rounded-lg bg-background px-4 py-2 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
        >
          Rozumiem
        </button>
      </div>
    </div>
  );
}
