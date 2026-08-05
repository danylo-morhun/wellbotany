import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "FAQ — Well Botany",
  description: "Najczęściej zadawane pytania dotyczące zamówień, płatności i produktów.",
};

const faqs = [
  {
    q: "Jak złożyć zamówienie?",
    a: "Dodaj wybrane produkty do koszyka, kliknij „Przejdź do kasy” i wypełnij dane dostawy. Następnie wybierz metodę dostawy i płatności. Po opłaceniu zamówienia otrzymasz e-mail z potwierdzeniem.",
  },
  {
    q: "Jakie są formy płatności?",
    a: "Akceptujemy: BLIK, karty płatnicze (Visa, Mastercard), Apple Pay, Google Pay oraz szybkie przelewy bankowe. Płatności obsługuje bezpieczny operator Przelewy24.",
  },
  {
    q: "Ile trwa realizacja i dostawa zamówienia?",
    a: "Zamówienia opłacone do godziny 14:00 w dni robocze wysyłamy tego samego dnia. Czas dostawy wynosi 1–2 dni robocze (Paczkomat InPost, kurier DPD lub DHL). Po nadaniu przesyłki otrzymasz e-mail z numerem śledzenia.",
  },
  {
    q: "Czy muszę mieć konto, żeby złożyć zamówienie?",
    a: "Nie — możesz złożyć zamówienie jako gość, podając tylko adres e-mail i dane dostawy. Rejestracja konta daje dostęp do historii zamówień i listy ulubionych.",
  },
  {
    q: "Jak sprawdzić status zamówienia?",
    a: "Po złożeniu zamówienia otrzymasz e-mail z potwierdzeniem. Każda zmiana statusu (opłacone, w realizacji, wysłane) jest automatycznie wysyłana na podany adres e-mail. Zalogowani użytkownicy mogą sprawdzić status w sekcji Moje konto → Zamówienia.",
  },
  {
    q: "Czy produkty mają certyfikaty i są bezpieczne?",
    a: "Tak. Wszystkie suplementy diety w naszym sklepie są zgłoszone do Głównego Inspektora Sanitarnego (GIS) i spełniają wymagania polskiego prawa żywnościowego. Sprzedajemy wyłącznie produkty od sprawdzonych producentów z pełną dokumentacją składu.",
  },
  {
    q: "Gdzie znajdę szczegółowe informacje o składnikach produktu?",
    a: "Pełen skład, wartości odżywcze i sposób użycia znajdziesz na stronie każdego produktu w zakładce Skład i dawkowanie. W razie pytań o interakcje z lekami lub schorzenia skonsultuj się z lekarzem lub farmaceutą.",
  },
];

export default function FaqPage() {
  return (
    <main className="container mx-auto max-w-prose px-4 py-12">
      <h1 className="mb-8 text-3xl">Najczęściej zadawane pytania</h1>

      <div className="space-y-4">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-2xl bg-card shadow-card open:shadow-card-hover"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-semibold marker:content-none">
              {faq.q}
              <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <p className="px-5 pb-5 text-sm text-muted-foreground">{faq.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-secondary p-6 text-center">
        <p className="text-sm font-semibold">Nie znalazłeś odpowiedzi?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Napisz do nas — odpowiemy w ciągu jednego dnia roboczego.
        </p>
        <a
          href="/kontakt"
          className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        >
          Napisz do nas
        </a>
      </div>
    </main>
  );
}
