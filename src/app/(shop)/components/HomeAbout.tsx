import Link from "next/link";

const POPULAR = [
  { label: "Magnez", href: "/kategoria/magnez" },
  { label: "Witamina D3", href: "/kategoria/witamina-d" },
  { label: "Witaminy z grupy B", href: "/kategoria/witaminy-b" },
  { label: "Kwasy omega-3", href: "/kategoria/kwasy-omega" },
  { label: "Probiotyki", href: "/kategoria/probiotyki" },
  { label: "Kolagen", href: "/kategoria/kolagen" },
  { label: "Adaptogeny", href: "/kategoria/adaptogeny" },
  { label: "Zioła jednoskładnikowe", href: "/kategoria/ziola-jednoskladnikowe" },
  { label: "Na odporność", href: "/kategoria/na-odpornosc" },
  { label: "Na sen", href: "/kategoria/na-sen" },
  { label: "Na stawy i kości", href: "/kategoria/na-stawy-i-kosci" },
  { label: "Na jelita i trawienie", href: "/kategoria/na-jelita-i-trawienie" },
];

/** Short "who we are" text + links into the main categories (crawlable, not just a menu). */
export function HomeAbout() {
  return (
    <section aria-labelledby="home-about-heading" className="grid gap-8 md:grid-cols-2">
      <div className="max-w-prose">
        <h2 id="home-about-heading" className="font-heading text-2xl text-foreground md:text-3xl">
          Sklep zielarski online z Kalisza
        </h2>
        <p className="mt-4 text-muted-foreground">
          Well Botany to internetowa odsłona zielarni Twoje Zdrowie, którą od ponad 20 lat
          prowadzimy w Kaliszu. W ofercie mamy ponad 1300 suplementów diety, witamin, minerałów,
          ekstraktów ziołowych, kosmetyków naturalnych i produktów bio od sprawdzonych producentów.
        </p>
        <p className="mt-3 text-muted-foreground">
          Przy każdym produkcie podajemy pełny skład, dawkę w porcji i sposób użycia. Zamówienia
          wysyłamy przez InPost, Orlen Paczkę i kuriera, a w Kaliszu możesz odebrać je osobiście.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Popularne kategorie</h3>
        <ul className="mt-4 flex flex-wrap gap-2">
          {POPULAR.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-block rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
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
