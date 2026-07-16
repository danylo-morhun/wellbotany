"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl bg-foreground p-4 text-background shadow-float sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        Używamy plików cookie do działania sklepu i analityki. Więcej w{" "}
        <Link href="/cookies" className="underline">
          polityce cookies
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={accept}
        className="shrink-0 rounded-lg bg-background px-4 py-2 text-sm font-medium text-foreground transition-opacity hover:opacity-90"
      >
        Rozumiem
      </button>
    </div>
  );
}
