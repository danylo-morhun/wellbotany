import { Clock, Mail } from "lucide-react";
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

export function Footer() {
  return (
    <footer className="mt-16 bg-band text-band-foreground print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="flex items-center">
              <span className="font-heading text-lg font-bold tracking-tight">Well Botany</span>
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

        <div className="mt-12 border-t border-band-foreground/15 pt-8 text-xs text-band-foreground/60">
          <p>&copy; {new Date().getFullYear()} Well Botany. Wszelkie prawa zastrzeżone.</p>
          <p className="mt-1">
            Suplement diety nie zastępuje zrównoważonej diety i zdrowego trybu życia.
          </p>
        </div>
      </div>
    </footer>
  );
}
