import Link from "next/link";

const legalLinks = [
  { label: "Regulamin", href: "/regulamin" },
  { label: "Polityka prywatności", href: "/polityka-prywatnosci" },
  { label: "Zwroty i reklamacje", href: "/zwroty" },
  { label: "Kontakt", href: "/kontakt" },
];

/** Checkout footer: only the documents a shopper may want before paying. */
export function CheckoutFooter() {
  return (
    <footer className="mt-16 border-t border-border print:hidden">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <nav aria-label="Informacje prawne">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {legalLinks.map((link) => (
              <li key={link.href}>
                {/* New tab: leaving this page would interrupt the order form */}
                <Link
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-8 items-center underline-offset-2 hover:text-foreground hover:underline"
                >
                  {link.label}
                  <span className="sr-only"> (otwiera się w nowej karcie)</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p>&copy; {new Date().getFullYear()} Well Botany</p>
      </div>
    </footer>
  );
}
