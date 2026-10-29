import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { sectionTitleClass } from "./SectionHeading";

/** Short "who we are" text for search engines. The second paragraph sits in a
 * closed <details>: still in the HTML, one tap away for people. */
export function HomeAbout() {
  return (
    <section aria-labelledby="home-about-heading" className="max-w-prose">
      <h2 id="home-about-heading" className={sectionTitleClass}>
        Sklep z suplementami i ziołami online
      </h2>
      <p className="mt-3 text-muted-foreground">
        Well Botany to sklep internetowy z suplementami diety, witaminami i ziołami. W ofercie mamy
        ponad 1300 suplementów, witamin, minerałów, ekstraktów ziołowych, kosmetyków naturalnych i
        produktów bio od sprawdzonych producentów.
      </p>
      <details className="group mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-primary hover:underline [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Czytaj więcej</span>
          <span className="hidden group-open:inline">Zwiń</span>
          <ChevronDown
            className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <p className="text-muted-foreground">
          Przy każdym produkcie podajemy pełny skład, dawkę w porcji i sposób użycia, a w{" "}
          <Link href="/poradnik" className="text-primary hover:underline">
            poradniku
          </Link>{" "}
          wyjaśniamy, jak wybierać suplementy. Zamówienia wysyłamy w ciągu 24–48 h do paczkomatu,
          punktu odbioru lub kurierem.
        </p>
      </details>
    </section>
  );
}
