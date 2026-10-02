import Link from "next/link";
import { NewsletterForm } from "@/features/newsletter/components/NewsletterForm";
import { sectionTitleClass } from "./SectionHeading";

export function NewsletterSection() {
  return (
    <section
      aria-labelledby="newsletter-h"
      className="relative overflow-hidden rounded-3xl bg-band px-6 py-12 text-center text-band-foreground md:py-14"
    >
      <div
        className="pointer-events-none absolute -left-12 -top-12 size-48 rounded-full bg-band-foreground/5 animate-float-soft motion-reduce:animate-none"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -right-10 size-56 rounded-full bg-band-foreground/5 animate-float-soft motion-reduce:animate-none"
        style={{ animationDelay: "1.5s" }}
        aria-hidden="true"
      />
      <div className="relative">
        <h2 id="newsletter-h" className={`mb-2 ${sectionTitleClass}`}>
          Promocje i porady na e-mail
        </h2>
        <p className="mx-auto max-w-md text-band-foreground/75">
          Nowe promocje, nowości w sklepie i artykuły z poradnika. Bez spamu.
        </p>
        <NewsletterForm />
        <p className="mx-auto mt-3 max-w-md text-xs text-band-foreground/60">
          Zapisując się, zgadzasz się na otrzymywanie newslettera. Zgodę możesz wycofać w każdej
          chwili.{" "}
          <Link href="/polityka-prywatnosci" className="underline hover:text-band-foreground">
            Polityka prywatności
          </Link>
        </p>
      </div>
    </section>
  );
}
