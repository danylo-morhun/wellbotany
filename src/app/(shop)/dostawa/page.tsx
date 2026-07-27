import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Dostawa i płatność — Twoje Zdrowie",
  description: "Informacje o metodach dostawy, kosztach i czasie realizacji zamówień.",
};

export default function DostawaPage() {
  return (
    <main className="container mx-auto max-w-prose px-4 py-12">
      <h1 className="mb-8 text-3xl">Dostawa i płatność</h1>

      <div className="space-y-10 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="mb-4 text-xl">Metody dostawy</h2>
          <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Metoda</th>
                  <th className="px-4 py-3 text-left font-semibold">Koszt</th>
                  <th className="px-4 py-3 text-left font-semibold">Czas dostawy</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-3">Paczkomat InPost</td>
                  <td className="px-4 py-3">12,99 zł</td>
                  <td className="px-4 py-3">1–2 dni robocze</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Kurier DPD</td>
                  <td className="px-4 py-3">15,99 zł</td>
                  <td className="px-4 py-3">1–2 dni robocze</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Kurier DHL</td>
                  <td className="px-4 py-3">17,99 zł</td>
                  <td className="px-4 py-3">1–2 dni robocze</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-success">Wszystkie metody</td>
                  <td className="px-4 py-3 font-medium text-success">GRATIS</td>
                  <td className="px-4 py-3 text-muted-foreground">przy zamówieniu od 200 zł</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Darmowa dostawa od 200 zł</h2>
          <p className="text-muted-foreground">
            Przy zamówieniu o wartości 200 zł lub więcej dostawa jest bezpłatna dla wszystkich
            dostępnych metod. Próg liczony jest od wartości produktów po zastosowaniu rabatów, bez
            uwzględnienia kosztów dostawy.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Paczkomaty InPost</h2>
          <p className="text-muted-foreground">
            Podczas składania zamówienia możesz wybrać dowolny Paczkomat InPost w Polsce. Po
            opłaceniu zamówienia otrzymasz e-mail z kodem odbioru oraz numerem przesyłki. Paczka
            czeka w paczkomacie przez 48 godzin od momentu dostarczenia.
          </p>
          <p className="mt-2 text-muted-foreground">
            Sieć liczy ponad 20 000 automatów na terenie całego kraju — znajdź najbliższy na{" "}
            <a
              href="https://inpost.pl/znajdz-paczkomat"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              inpost.pl
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Śledzenie przesyłki</h2>
          <p className="text-muted-foreground">
            Po nadaniu paczki wyślemy Ci e-mail z numerem śledzenia oraz linkiem do śledzenia
            przesyłki na stronie przewoźnika. Powiadomienie wysyłamy automatycznie w momencie
            przekazania paczki do kuriera.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Dostawa za granicę</h2>
          <p className="text-muted-foreground">
            Aktualnie realizujemy dostawy wyłącznie na terenie Polski. Dostawę zagraniczną planujemy
            uruchomić w przyszłości — śledź nasze nowości.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Formy płatności</h2>
          <p className="text-muted-foreground">
            Płatności obsługuje operator Przelewy24. Akceptujemy:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            <li>BLIK</li>
            <li>Karty płatnicze (Visa, Mastercard)</li>
            <li>Apple Pay i Google Pay</li>
            <li>Szybkie przelewy bankowe</li>
            <li>Przelew tradycyjny</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Zamówienie jest realizowane po potwierdzeniu płatności przez Przelewy24.
          </p>
        </section>
      </div>
    </main>
  );
}
