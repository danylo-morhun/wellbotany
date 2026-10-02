"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, Gift, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { captureCouponFromUrl } from "@/features/cart/lib/saved-coupon";
import { CONSENT_CHANGE_EVENT, readConsent } from "@/lib/analytics";
import { WELCOME_COUPON_VALID_DAYS, WELCOME_DISCOUNT_PERCENT } from "../lib/constants";
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
  return HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function teaserHiddenOn(pathname: string): boolean {
  // The product page's sticky add-to-cart bar owns the bottom of a phone screen
  return (
    hiddenOn(pathname) ||
    (pathname.startsWith("/produkt/") && window.matchMedia("(max-width: 767px)").matches)
  );
}

const PERKS = [
  "Kod rabatowy od razu na e-mail",
  "Promocje i nowości przed innymi",
  "Porady z naszego poradnika",
];

export function NewsletterPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Opened from the teaser: closing it again isn't another dismissal
  const [manual, setManual] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [done, setDone] = useState(false);
  const triggered = useRef(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Read once: the param is stripped from the URL, and effects may run twice in dev
  const forcedOpen = useRef<boolean | null>(null);
  useEffect(() => {
    captureCouponFromUrl();
    // ?newsletter opens the prompt right away — for links and for testing
    if (forcedOpen.current === null) {
      const url = new URL(window.location.href);
      forcedOpen.current = url.searchParams.has("newsletter");
      url.searchParams.delete("newsletter");
      window.history.replaceState(window.history.state, "", url);
    }
    if (!forcedOpen.current) return;
    triggered.current = true;
    const openNow = () => {
      setManual(true);
      setOpen(true);
    };
    if (readConsent()) openNow();
    else window.addEventListener(CONSENT_CHANGE_EVENT, openNow, { once: true });
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, openNow);
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

  const showTeaser = teaser && !open && !teaserHiddenOn(pathname);

  return (
    <>
      {showTeaser && (
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
      )}

      <Dialog.Root open={open && !hiddenOn(pathname)} onOpenChange={(next) => !next && close()}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
          <Dialog.Popup
            ref={popupRef}
            // Focus the dialog itself: no ring on the close button, no keyboard pop-up on phones
            initialFocus={popupRef}
            className="fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-card text-card-foreground shadow-float outline-none transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none md:grid-cols-[5fr_6fr] print:hidden"
          >
            <div className="relative overflow-hidden bg-band px-6 py-7 text-band-foreground md:flex md:flex-col md:justify-center md:p-10">
              <div
                className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-band-foreground/5"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -bottom-20 -left-12 size-56 rounded-full bg-band-foreground/5"
                aria-hidden="true"
              />
              <p className="relative font-heading text-6xl font-extrabold leading-none tracking-tight md:text-8xl">
                -{WELCOME_DISCOUNT_PERCENT}%
              </p>
              <p className="relative mt-2 text-lg font-semibold md:mt-3 md:text-xl">
                na pierwsze zakupy
              </p>
              <ul className="relative mt-8 hidden space-y-3 text-sm text-band-foreground/85 md:block">
                {PERKS.map((perk) => (
                  <li key={perk} className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0" aria-hidden="true" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative px-6 py-7 md:flex md:flex-col md:justify-center md:p-10">
              <Dialog.Close
                aria-label="Zamknij"
                className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
              <Dialog.Title className="pr-8 font-heading text-2xl font-bold tracking-tight md:text-3xl">
                Zapisz się i odbierz rabat
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-muted-foreground">
                Podaj e-mail — wyślemy Ci jednorazowy kod -{WELCOME_DISCOUNT_PERCENT}% ważny{" "}
                {WELCOME_COUPON_VALID_DAYS} dni. Potem tylko promocje i porady, bez spamu.
              </Dialog.Description>
              <NewsletterForm variant="card" onSubscribed={() => setDone(true)} />
              <p className="mt-3 text-xs text-muted-foreground">
                Zapisując się, zgadzasz się na newsletter; zgodę wycofasz w każdej chwili.{" "}
                <Link href="/polityka-prywatnosci" className="underline hover:text-foreground">
                  Polityka prywatności
                </Link>
              </p>
              {!done && (
                <Dialog.Close className="mt-5 self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Nie, dziękuję
                </Dialog.Close>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
