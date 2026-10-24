"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  type Consent,
  MARKETING_ENABLED,
  needsConsentPrompt,
  OPEN_COOKIE_SETTINGS_EVENT,
  readConsent,
  saveConsent,
} from "@/lib/consent";
import { MARKETING_TOOLS } from "@/lib/marketing-config";

// Equal weight on purpose: rejecting must be as easy and visible as accepting (PKE art. 399, EDPB)
const BUTTON =
  "rounded-lg bg-background px-4 py-2 text-sm font-medium text-foreground transition-opacity hover:opacity-90";

const NONE: Consent = { analytics: false, marketing: false };
const ALL: Consent = { analytics: true, marketing: true };

export function CookieBanner() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  // Rendered on the server so it paints with the page instead of after
  // hydration (it was the mobile LCP element, ~3.5 s); hidden by CSS when
  // consent is already stored, and dropped after hydration.
  const [visible, setVisible] = useState(true);
  const [reopened, setReopened] = useState(false);
  const [settings, setSettings] = useState(false);
  // Optional categories start unticked (Planet49, C-673/17)
  const [choice, setChoice] = useState<Consent>(NONE);
  const analyticsId = useId();
  const marketingId = useId();

  useEffect(() => {
    if (!needsConsentPrompt()) {
      setVisible(false);
      return;
    }
    // A v1 "accepted" with no marketing category to ask about yet: same choice, new format
    if (!MARKETING_ENABLED && readConsent()) {
      saveConsent({ analytics: true, marketing: false }, { log: false });
      setVisible(false);
      return;
    }
    // Re-asked v1 "accepted" (analytics only) — keep that box ticked
    setChoice(readConsent() ?? NONE);
  }, []);

  // "Ustawienia cookies" in the footer reopens the banner to change the choice
  useEffect(() => {
    const open = () => {
      setVisible(true);
      setReopened(true);
      setSettings(true);
      setChoice(readConsent() ?? NONE);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  function respond(consent: Consent) {
    saveConsent(consent);
    setVisible(false);
    setReopened(false);
    setSettings(false);
  }

  if (isAdmin || !visible) return null;

  return (
    <div
      id="cookie-banner"
      data-open={reopened ? "" : undefined}
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-label="Zgoda na pliki cookie"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl bg-foreground p-4 text-background shadow-float print:hidden"
    >
      <p className="text-sm">
        Cookie niezbędne (koszyk, logowanie) działają zawsze. Za Twoją zgodą użyjemy też cookies
        analitycznych (Google Analytics)
        {MARKETING_ENABLED &&
          ` i marketingowych — do pomiaru i optymalizacji naszych reklam w ${MARKETING_TOOLS}`}
        . Zgodę zmienisz w każdej chwili w „Ustawieniach cookies” w stopce. Więcej w{" "}
        <Link href="/cookies" className="underline">
          polityce cookies
        </Link>
        .
      </p>

      {settings && (
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="sr-only">Wybierz kategorie cookies</legend>
          <label className="flex items-start gap-2 opacity-70">
            <input type="checkbox" checked disabled className="mt-0.5 size-4" />
            <span>Niezbędne — koszyk, logowanie, zapamiętanie tej decyzji (zawsze aktywne)</span>
          </label>
          <label htmlFor={analyticsId} className="flex items-start gap-2">
            <input
              id={analyticsId}
              type="checkbox"
              checked={choice.analytics}
              onChange={(e) => setChoice((c) => ({ ...c, analytics: e.target.checked }))}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>Analityczne — Google Analytics: statystyki odwiedzin i zakupów</span>
          </label>
          {MARKETING_ENABLED && (
            <label htmlFor={marketingId} className="flex items-start gap-2">
              <input
                id={marketingId}
                type="checkbox"
                checked={choice.marketing}
                onChange={(e) => setChoice((c) => ({ ...c, marketing: e.target.checked }))}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                Marketingowe — {MARKETING_TOOLS}: pomiar, które reklamy prowadzą do zakupów
              </span>
            </label>
          )}
        </fieldset>
      )}

      <div className="flex flex-wrap justify-end gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
        <button type="button" onClick={() => respond(NONE)} className={BUTTON}>
          Odrzucam
        </button>
        {settings ? (
          <button type="button" onClick={() => respond(choice)} className={BUTTON}>
            Zapisuję wybór
          </button>
        ) : (
          <button type="button" onClick={() => setSettings(true)} className={BUTTON}>
            Ustawienia
          </button>
        )}
        <button type="button" onClick={() => respond(ALL)} className={BUTTON}>
          Akceptuję wszystkie
        </button>
      </div>
    </div>
  );
}
