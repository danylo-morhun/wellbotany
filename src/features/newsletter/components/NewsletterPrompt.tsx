"use client";

import { Gift, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { captureCouponFromUrl } from "@/features/cart/lib/saved-coupon";
import { CONSENT_CHANGE_EVENT, readConsent } from "@/lib/analytics";
import { WELCOME_DISCOUNT_PERCENT } from "../lib/constants";
import {
  hideTeaser,
  markDismissed,
  markPromptedThisSession,
  promptAllowed,
  recordVisit,
  SUBSCRIBED_EVENT,
  teaserAllowed,
} from "../lib/prompt-state";
import { NewsletterForm } from "./NewsletterForm";

// Opens by itself once the visitor is browsing, not on arrival: from the 2nd
// page view after ENGAGED_MS on the site, or on desktop exit intent. At most
// once per session, never while the cookie banner is up or on cart/checkout/
// account pages. Closed, it shrinks to a corner teaser and comes back after a
// growing pause (see prompt-state); after subscribing, never again.
const ENGAGED_MS = 20_000;
const EXIT_INTENT_MIN_MS = 8_000;
const AFTER_CONSENT_MS = 4_000;
const HIDDEN_PATHS = ["/koszyk", "/zamowienie", "/konto", "/logowanie", "/rejestracja"];

function hiddenOn(pathname: string): boolean {
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  // The product page's sticky add-to-cart bar owns the bottom of a phone screen
  return pathname.startsWith("/produkt/") && window.matchMedia("(max-width: 767px)").matches;
}

export function NewsletterPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Opened from the teaser: closing it again isn't another dismissal
  const [manual, setManual] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [done, setDone] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    captureCouponFromUrl();
    // ?newsletter opens the prompt right away — for links and for testing
    const url = new URL(window.location.href);
    if (!url.searchParams.has("newsletter")) return;
    url.searchParams.delete("newsletter");
    window.history.replaceState(window.history.state, "", url);
    triggered.current = true;
    setManual(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    const hide = () => setTeaser(false);
    window.addEventListener(SUBSCRIBED_EVENT, hide);
    return () => window.removeEventListener(SUBSCRIBED_EVENT, hide);
  }, []);

  useEffect(() => {
    const visit = recordVisit();
    // Never next to an unanswered cookie banner (consent can be withdrawn later)
    setTeaser(readConsent() !== null && teaserAllowed());
    if (triggered.current || !promptAllowed() || hiddenOn(pathname)) return;

    let consentWait: (() => void) | null = null;
    const show = () => {
      // Re-checked: the visitor may have subscribed on this page meanwhile
      if (triggered.current || !promptAllowed() || hiddenOn(window.location.pathname)) return;
      if (!readConsent()) {
        // Let the cookie banner go first, then give the page a moment
        if (consentWait) return;
        consentWait = () => window.setTimeout(show, AFTER_CONSENT_MS);
        window.addEventListener(CONSENT_CHANGE_EVENT, consentWait, { once: true });
        return;
      }
      triggered.current = true;
      markPromptedThisSession();
      setManual(false);
      setOpen(true);
    };

    const elapsed = Date.now() - visit.start;
    const timer =
      visit.views >= 2 ? window.setTimeout(show, Math.max(0, ENGAGED_MS - elapsed)) : undefined;

    const onExitIntent = (e: MouseEvent) => {
      if (
        e.relatedTarget === null &&
        e.clientY <= 0 &&
        Date.now() - visit.start >= EXIT_INTENT_MIN_MS
      ) {
        show();
      }
    };
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (desktop) document.addEventListener("mouseout", onExitIntent);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", onExitIntent);
      if (consentWait) window.removeEventListener(CONSENT_CHANGE_EVENT, consentWait);
    };
  }, [pathname]);

  const close = () => {
    if (!done && !manual) markDismissed();
    setOpen(false);
    setTeaser(!done && teaserAllowed());
  };

  const openFromTeaser = () => {
    setManual(true);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  if (!open && !teaser) return null;
  if (hiddenOn(pathname)) return null;

  if (!open) {
    return (
      <div className="fixed bottom-3 left-3 z-40 flex items-center rounded-full bg-primary text-primary-foreground shadow-float animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none sm:bottom-6 sm:left-6 print:hidden">
        <button
          type="button"
          onClick={openFromTeaser}
          className="flex items-center gap-2 rounded-full py-2.5 pl-4 pr-2 text-sm font-semibold"
        >
          <Gift className="size-4" aria-hidden="true" />-{WELCOME_DISCOUNT_PERCENT}% za zapis
        </button>
        <button
          type="button"
          onClick={() => {
            hideTeaser();
            setTeaser(false);
          }}
          aria-label="Ukryj ofertę rabatu"
          className="mr-1.5 rounded-full p-1.5 opacity-80 transition-opacity hover:bg-primary-foreground/15 hover:opacity-100"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="newsletter-prompt-h"
      className="fixed inset-x-3 bottom-3 z-40 rounded-2xl bg-card p-5 text-card-foreground shadow-float animate-in fade-in slide-in-from-bottom-4 duration-300 motion-reduce:animate-none sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[380px] print:hidden"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Zamknij"
        className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <p id="newsletter-prompt-h" className="pr-8 text-lg font-semibold">
        -{WELCOME_DISCOUNT_PERCENT}% na pierwsze zakupy
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Zapisz się do newslettera — kod wyślemy na e-mail. Promocje i porady, bez spamu.
      </p>
      <NewsletterForm variant="card" onSubscribed={() => setDone(true)} />
      <p className="mt-3 text-xs text-muted-foreground">
        Zapisując się, zgadzasz się na newsletter; zgodę wycofasz w każdej chwili.{" "}
        <Link href="/polityka-prywatnosci" className="underline hover:text-foreground">
          Polityka prywatności
        </Link>
      </p>
    </div>
  );
}
