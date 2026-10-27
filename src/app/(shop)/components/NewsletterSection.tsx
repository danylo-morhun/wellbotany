import { PrivacyNote } from "@/components/PrivacyNote";
import { NewsletterForm } from "@/features/newsletter/components/NewsletterForm";
import { WELCOME_DISCOUNT_PERCENT } from "@/features/newsletter/lib/constants";
import { sectionTitleClass } from "./SectionHeading";

export function NewsletterSection() {
  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-h"
      className="rounded-3xl bg-band px-6 py-10 text-center text-band-foreground md:py-12"
    >
      <div>
        <h2 id="newsletter-h" className={`mb-2 ${sectionTitleClass}`}>
          -{WELCOME_DISCOUNT_PERCENT}% na pierwsze zakupy za zapis
        </h2>
        <p className="mx-auto max-w-md text-band-foreground/75">
          Zapisz się do newslettera, a kod rabatowy wyślemy na Twój e-mail. Potem tylko promocje,
          nowości i porady — bez spamu.
        </p>
        <NewsletterForm />
        <PrivacyNote
          consent
          purpose="Zapisując się, zgadzasz się na newsletter — e-mail przetwarzamy, aby wysyłać kod rabatowy, promocje i porady."
          className="mx-auto mt-3 max-w-md text-xs text-band-foreground/60"
          linkClassName="underline hover:text-band-foreground"
        />
      </div>
    </section>
  );
}
