import { Clock, Mail, MapPin } from "lucide-react";
import Link from "next/link";

const footerLinks = {
  sklep: [
    { label: "Katalog produktów", href: "/katalog" },
    { label: "Marki", href: "/marki" },
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

const paymentMethods = ["BLIK", "Przelewy24", "Apple Pay", "Google Pay"];
const deliveryMethods = ["InPost", "DHL", "DPD"];

export function Footer() {
  return (
    <footer className="mt-16 bg-band text-band-foreground print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-card text-base font-extrabold text-primary">
                +
              </span>
              <span className="text-lg font-extrabold tracking-tight">Well Botany</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-band-foreground/75">
              Certyfikowane suplementy diety, witaminy i produkty bio najwyższej jakości.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-band-foreground/75">
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0" strokeWidth={1.75} />
                kontakt@wellbotany.pl
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="size-4 shrink-0" strokeWidth={1.75} />
                pon–pt 9:00–17:00
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="size-4 shrink-0" strokeWidth={1.75} />
                Kalisz, Polska
              </li>
            </ul>
          </div>

          {(
            [
              ["Sklep", footerLinks.sklep],
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
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-band-foreground/15 pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {paymentMethods.map((method) => (
              <span
                key={method}
                className="rounded-md bg-band-foreground/10 px-2.5 py-1 text-xs font-semibold text-band-foreground/90"
              >
                {method}
              </span>
            ))}
            <span
              className="mx-1 hidden h-4 w-px bg-band-foreground/20 sm:block"
              aria-hidden="true"
            />
            {deliveryMethods.map((method) => (
              <span
                key={method}
                className="rounded-md bg-band-foreground/10 px-2.5 py-1 text-xs font-semibold text-band-foreground/90"
              >
                {method}
              </span>
            ))}
          </div>
          <div className="text-xs text-band-foreground/60">
            <p>&copy; {new Date().getFullYear()} Well Botany. Wszelkie prawa zastrzeżone.</p>
            <p className="mt-1">
              Suplement diety nie zastępuje zrównoważonej diety i zdrowego trybu życia.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
