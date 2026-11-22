import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { sectionTitleClass } from "./SectionHeading";

/** Short "who we are" text for search engines. The second paragraph sits in a
 * closed <details>: still in the HTML, one tap away for people. */
export function HomeAbout() {
  return (
    <section aria-labelledby="home-about-heading" className="max-w-prose">
      <h2 id="home-about-heading" className={sectionTitleClass}>
        Suplementy, zioła i zdrowa żywność online
      </h2>
      <p className="mt-3 text-muted-foreground">
        Well Botany to sklep internetowy z suplementami diety, ziołami i zdrową żywnością. W ofercie
        mamy suplementy, witaminy, minerały, ekstrakty ziołowe i kosmetyki naturalne, a obok nich
        czekolady, przekąski, kawę, herbatę i słodziki – wszystko od sprawdzonych producentów.
      </p>
      <details className="group mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-primary hover:underline [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Czytaj więcej</span>
          <span className="hidden group-open:inline">Zwiń</span>
          <ChevronDown
            className="size-4 transition-transform spring-snappy group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <p className="text-muted-foreground">
          Przy każdym produkcie podajemy pełny skład, dawkę w porcji i sposób użycia, a w{" "}
          <Link href="/poradnik" className="text-primary hover:underline">
            poradniku
          </Link>{" "}
          wyjaśniamy, jak wybierać suplementy. Zamówienia wysyłamy w ciągu 2 dni roboczych do
          paczkomatu, punktu odbioru lub kurierem.
        </p>
      </details>
    </section>
  );
}
