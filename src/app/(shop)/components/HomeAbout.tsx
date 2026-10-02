import Link from "next/link";
import { sectionTitleClass } from "./SectionHeading";

// Categories not linked elsewhere on the homepage (needs + ingredient tiles cover the rest)
const MORE_CATEGORIES = [
  { label: "Zioła jednoskładnikowe", href: "/kategoria/ziola-jednoskladnikowe" },
  { label: "Multiwitaminy", href: "/kategoria/multiwitaminy" },
  { label: "Aminokwasy", href: "/kategoria/aminokwasy" },
  { label: "Adaptogeny", href: "/kategoria/adaptogeny" },
  { label: "Grzyby funkcjonalne", href: "/kategoria/grzyby-funkcjonalne" },
  { label: "Kurkuma", href: "/kategoria/kurkuma" },
  { label: "Koenzym Q10", href: "/kategoria/koenzym-q10" },
  { label: "Witamina K2", href: "/kategoria/witamina-k2" },
  { label: "Spirulina i chlorella", href: "/kategoria/algi-i-superfoods" },
  { label: "Polifenole", href: "/kategoria/polifenole" },
  { label: "Selen", href: "/kategoria/selen" },
  { label: "Pielęgnacja twarzy", href: "/kategoria/pielegnacja-twarzy" },
];

/** Short "who we are" text + links into the main categories (crawlable, not just a menu). */
export function HomeAbout() {
  return (
    <section aria-labelledby="home-about-heading" className="grid gap-8 md:grid-cols-2">
      <div className="max-w-prose">
        <h2 id="home-about-heading" className={sectionTitleClass}>
          Sklep z suplementami i ziołami online
        </h2>
        <p className="mt-4 text-muted-foreground">
          Well Botany to sklep internetowy z suplementami diety, witaminami i ziołami. W ofercie
          mamy ponad 1300 suplementów, witamin, minerałów, ekstraktów ziołowych, kosmetyków
          naturalnych i produktów bio od sprawdzonych producentów.
        </p>
        <p className="mt-3 text-muted-foreground">
          Przy każdym produkcie podajemy pełny skład, dawkę w porcji i sposób użycia, a w{" "}
          <Link href="/poradnik" className="text-primary hover:underline">
            poradniku
          </Link>{" "}
          wyjaśniamy, jak wybierać suplementy. Zamówienia wysyłamy w ciągu 24–48 h do paczkomatu,
          punktu odbioru lub kurierem.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Więcej kategorii</h3>
        <ul className="mt-4 flex flex-wrap gap-2">
          {MORE_CATEGORIES.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex min-h-9 items-center rounded-full bg-secondary px-3.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground motion-reduce:transition-none"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
