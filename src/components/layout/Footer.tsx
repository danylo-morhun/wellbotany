import { Clock, Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";
import { getListingFlags } from "@/features/catalog/lib/listing-flags";
import { PAYMENT_LABELS } from "@/features/checkout/lib/payment";
import { SHIPPING_LABELS, SHIPPING_METHODS_BY_PRICE } from "@/features/checkout/lib/shipping";
import { isP24Enabled } from "@/features/przelewy24/lib/config";

// Same sources as checkout, so the footer can't drift from what's offered
const SHIPPING_METHODS = SHIPPING_METHODS_BY_PRICE.map((m) => SHIPPING_LABELS[m]);
const ONLINE_PAYMENTS = ["BLIK", "PRZELEWY24", "APPLE_PAY", "GOOGLE_PAY"].map(
  (m) => PAYMENT_LABELS[m],
);

const footerLinks = {
  sklep: [
    { label: "Katalog produktów", href: "/katalog" },
    { label: "Marki", href: "/marki" },
    { label: "Składniki A–Z", href: "/skladniki" },
    { label: "Poradnik", href: "/poradnik" },
    { label: "Nowości", href: "/katalog?nowosci=1" },
    { label: "Promocje", href: "/katalog?promocje=1" },
  ],
  pomoc: [
    { label: "Dostawa i płatność", href: "/dostawa" },
    { label: "Zwroty i reklamacje", href: "/zwroty" },
    { label: "FAQ", href: "/faq" },
    { label: "Kontakt", href: "/kontakt" },
  ],
  firma: [
    { label: "O nas", href: "/o-nas" },
    { label: "Polityka prywatności", href: "/polityka-prywatnosci" },
    { label: "Regulamin", href: "/regulamin" },
    { label: "Cookies", href: "/cookies" },
  ],
};

export async function Footer() {
  const { hasPromos, hasNewArrivals } = await getListingFlags();
  // Links to an empty listing are hidden until it has products
  const sklepLinks = footerLinks.sklep.filter(
    (l) =>
      (hasPromos || l.href !== "/katalog?promocje=1") &&
      (hasNewArrivals || l.href !== "/katalog?nowosci=1"),
  );
  const paymentMethods = [
    ...(isP24Enabled() ? ONLINE_PAYMENTS : []),
    PAYMENT_LABELS.BANK_TRANSFER,
    `${PAYMENT_LABELS.CASH_ON_DELIVERY} w sklepie`,
  ];

  return (
    <footer className="mt-16 bg-band text-band-foreground print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center">
              <Image
                src="/branding/logo-horizontal-white.svg"
                alt="Well Botany"
                width={177}
                height={31}
                className="h-7 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-band-foreground/75">
              Suplementy diety, witaminy i zioła z pełnym składem i dawką przy każdym produkcie.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-band-foreground/75">
              <li>
                <a
                  href="tel:+48797771703"
                  className="flex items-center gap-2.5 transition-colors hover:text-band-foreground"
                >
                  <Phone className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  +48 797 771 703
                </a>
              </li>
              <li>
                <a
                  href="mailto:kontakt@wellbotany.pl"
                  className="flex items-center gap-2.5 transition-colors hover:text-band-foreground"
                >
                  <Mail className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  kontakt@wellbotany.pl
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                pon–pt 9:00–18:00, sob 9:00–14:00
              </li>
            </ul>
          </div>

          {(
            [
              ["Sklep", sklepLinks],
              ["Pomoc", footerLinks.pomoc],
              ["Firma", footerLinks.firma],
            ] as const
          ).map(([title, links]) => (
            <div key={title}>
              <p className="text-sm font-bold">{title}</p>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-band-foreground/75 transition-colors hover:text-band-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {title === "Firma" && (
                  <li>
                    <CookieSettingsButton className="text-sm text-band-foreground/75 transition-colors hover:text-band-foreground" />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-6 border-t border-band-foreground/15 pt-8 sm:grid-cols-2">
          {(
            [
              ["Płatność", paymentMethods],
              ["Dostawa", SHIPPING_METHODS],
            ] as const
          ).map(([title, methods]) => (
            <div key={title}>
              <p className="text-sm font-bold">{title}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {methods.map((m) => (
                  <li
                    key={m}
                    className="rounded-full bg-band-foreground/10 px-3 py-1 text-xs font-medium text-band-foreground/85"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-band-foreground/15 pt-8 text-xs text-band-foreground/60">
          <p>&copy; {new Date().getFullYear()} Well Botany. Wszelkie prawa zastrzeżone.</p>
          <p className="mt-1">
            Suplement diety nie zastępuje zrównoważonej diety i zdrowego trybu życia.
          </p>
        </div>
      </div>
    </footer>
  );
}
