import { Clock, Mail, Phone, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";
import { getListingFlags } from "@/features/catalog/lib/listing-flags";
import { PAYMENT_LABELS } from "@/features/checkout/lib/payment";
import { carrierLogo, shippingLabel } from "@/features/checkout/lib/shipping";
import { getShippingRates } from "@/features/checkout/lib/shipping-rates";
import { isP24Enabled } from "@/features/przelewy24/lib/config";
import { SELLER } from "@/lib/seller";

// Same sources as checkout, so the footer can't drift from what's offered
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
    { label: "Odstąp od umowy tutaj", href: "/odstapienie" },
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
  const [{ hasPromos, hasNewArrivals }, shippingRates] = await Promise.all([
    getListingFlags(),
    getShippingRates(),
  ]);
  const shippingMethods = shippingRates.map((r) => ({
    label: shippingLabel(r.method),
    logo: carrierLogo(r.method),
  }));
  // Links to an empty listing are hidden until it has products
  const sklepLinks = footerLinks.sklep.filter(
    (l) =>
      (hasPromos || l.href !== "/katalog?promocje=1") &&
      (hasNewArrivals || l.href !== "/katalog?nowosci=1"),
  );
  // Pay-at-pickup exists only while in-store pickup is offered (as in StepPayment)
  const paymentMethods = [
    ...(isP24Enabled() ? ONLINE_PAYMENTS : []),
    PAYMENT_LABELS.BANK_TRANSFER,
    ...(shippingRates.some((r) => r.method === "PICKUP")
      ? [`${PAYMENT_LABELS.CASH_ON_DELIVERY} w sklepie`]
      : []),
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
                {SELLER.hours}
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
            <nav key={title} aria-label={title}>
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
            </nav>
          ))}
        </div>

        <div className="mt-12 grid gap-6 border-t border-band-foreground/15 pt-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-bold">Płatność</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {paymentMethods.map((m) => (
                <li
                  key={m}
                  className="flex h-8 items-center rounded-full bg-band-foreground/10 px-3 text-xs font-medium text-band-foreground/85"
                >
                  {m}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold">Dostawa</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {shippingMethods.map((m) => (
                <li
                  key={m.label}
                  className="flex h-8 items-center gap-2 rounded-full bg-band-foreground/10 py-1 pl-1 pr-3 text-xs font-medium text-band-foreground/85"
                >
                  {/* White plate keeps carrier colours true on the dark band */}
                  <span className="flex h-6 w-10 shrink-0 items-center justify-center rounded-full bg-white px-1">
                    {m.logo ? (
                      <Image
                        src={m.logo}
                        alt=""
                        width={40}
                        height={24}
                        className="h-4 w-full object-contain"
                      />
                    ) : (
                      <Store className="size-3.5 text-primary" aria-hidden />
                    )}
                  </span>
                  {m.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-band-foreground/15 pt-8 text-xs text-band-foreground/75">
          <p>&copy; {new Date().getFullYear()} Well Botany. Wszelkie prawa zastrzeżone.</p>
          <p className="mt-1">
            Suplement diety nie zastępuje zrównoważonej diety i zdrowego trybu życia.
          </p>
        </div>
      </div>
    </footer>
  );
}
