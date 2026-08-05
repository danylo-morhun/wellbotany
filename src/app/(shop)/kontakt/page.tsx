import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/features/contact/components/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt — Well Botany",
  description: "Skontaktuj się z nami — e-mail, telefon, godziny obsługi.",
};

export default function KontaktPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl">Kontakt</h1>

      <div className="space-y-8">
        <p className="text-sm text-muted-foreground">
          Masz pytanie dotyczące produktu, zamówienia lub dostawy? Chętnie pomożemy.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-card">
            <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">E-mail</p>
              <a
                href="mailto:kontakt@wellbotany.pl"
                className="mt-1 block text-sm text-muted-foreground hover:text-primary"
              >
                kontakt@wellbotany.pl
              </a>
              <p className="mt-1 text-xs text-muted-foreground">
                Odpowiedź w ciągu 24 h (dni robocze)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-card">
            <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Telefon</p>
              <a
                href="tel:+48000000000"
                className="mt-1 block text-sm text-muted-foreground hover:text-primary"
              >
                +48 000 000 000
              </a>
              <p className="mt-1 text-xs text-muted-foreground">Pon–Pt, 9:00–17:00</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-card">
            <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Godziny obsługi</p>
              <p className="mt-1 text-sm text-muted-foreground">Poniedziałek – Piątek</p>
              <p className="text-sm text-muted-foreground">9:00 – 17:00</p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-card">
            <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Adres</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Well Botany sp. z o.o.
                <br />
                ul. Przykładowa 1
                <br />
                62-800 Kalisz
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl bg-secondary p-6">
          <h2 className="mb-4 text-lg">Formularz kontaktowy</h2>
          <ContactForm />
        </section>
      </div>
    </main>
  );
}
