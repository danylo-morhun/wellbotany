import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Polityka prywatności — Well Botany",
  description: "Zasady przetwarzania danych osobowych w sklepie Well Botany.",
};

const purposes = [
  {
    title: "Złożenie zamówienia w Sklepie",
    goal: "realizacja Twojego zamówienia",
    basis: [
      "umowa sprzedaży (art. 6 ust. 1 lit. b RODO)",
      "obowiązek prawny związany z rachunkowością (art. 6 ust. 1 lit. c RODO)",
    ],
    duration:
      "przez okres obowiązywania umowy, do wygaśnięcia obowiązku prawnego dot. rachunkowości, a dodatkowo do upływu okresu, w którym możliwe jest dochodzenie roszczeń.",
    consequence: "nie będziesz mieć możliwości złożenia zamówienia",
  },
  {
    title: "Założenie Konta w Sklepie",
    goal: "realizacja umowy o świadczenie usługi prowadzenia Konta",
    basis: ["umowa o świadczenie usług (art. 6 ust. 1 lit. b RODO)"],
    duration:
      "do momentu usunięcia Konta przez Ciebie lub przez nas na Twoje żądanie, a dodatkowo do upływu okresu dochodzenia roszczeń.",
    consequence:
      "nie będziesz mieć możliwości założenia Konta i korzystania z jego funkcji (historia zamówień, status zamówienia)",
  },
  {
    title: "Nawiązanie z nami kontaktu",
    goal: "obsługa Twoich zapytań lub zgłoszeń",
    basis: [
      "umowa lub działania zmierzające do jej zawarcia (art. 6 ust. 1 lit. b RODO) — gdy zapytanie dotyczy umowy",
      "nasz prawnie uzasadniony interes w prowadzeniu z Tobą komunikacji (art. 6 ust. 1 lit. f RODO) — gdy zapytanie nie dotyczy umowy",
    ],
    duration:
      "przez czas trwania umowy lub do upływu okresu dochodzenia roszczeń, ewentualnie do momentu uwzględnienia Twojego sprzeciwu wobec przetwarzania.",
    consequence: "nie będziemy mieli możliwości udzielenia odpowiedzi na Twoje zapytanie",
  },
  {
    title: "Ustalenie, dochodzenie lub obrona roszczeń",
    goal: "ustalenie, dochodzenie lub obrona roszczeń związanych z zawartą umową lub usługami",
    basis: ["nasz prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO)"],
    duration:
      "do upływu okresu przedawnienia roszczeń lub do momentu uwzględnienia Twojego sprzeciwu wobec przetwarzania.",
    consequence: "brak możliwości ustalenia, dochodzenia lub obrony roszczeń",
  },
];

const recipients = [
  {
    action: "każde działanie w związku ze Sklepem",
    recipient: "dostawca oprogramowania sklepowego i hostingu",
  },
  {
    action: "złożenie zamówienia w Sklepie",
    recipient: "operator płatności Przelewy24 (PayPro S.A.)",
  },
  { action: "dostawa zamówienia", recipient: "InPost, Orlen Paczka, DHL, DPD" },
  {
    action: "prowadzenie księgowości",
    recipient: "biuro rachunkowe, dostawca oprogramowania księgowego",
  },
  {
    action: "nawiązanie kontaktu",
    recipient: "dostawca standardowego oprogramowania biurowego (w tym poczty e-mail)",
  },
];

export default function PolitykaPrywatnosciPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl">Polityka prywatności</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Poniżej znajdziesz najważniejsze informacje o zasadach przetwarzania Twoich danych osobowych
        oraz plikach cookies w sklepie Well Botany, przygotowane zgodnie z Rozporządzeniem
        Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO).
      </p>

      <div className="space-y-10 text-sm leading-relaxed">
        <section>
          <h2 className="mb-3 text-xl">Administrator danych</h2>
          <p className="text-muted-foreground">
            Administratorem Twoich danych osobowych jest ZIELARNIA KALISKA II SPÓŁKA Z OGRANICZONĄ
            ODPOWIEDZIALNOŚCIĄ z siedzibą w Kaliszu, wpisana do rejestru przedsiębiorców Krajowego
            Rejestru Sądowego pod numerem KRS 0001105400, NIP 6182203142, REGON 528620490, adres:
            ul. Polna 102, 62-800 Kalisz — właściciel sklepu internetowego Well Botany. W sprawach
            dotyczących danych osobowych możesz skontaktować się z nami pod adresem{" "}
            <a
              href="mailto:kontakt@wellbotany.pl"
              className="text-primary underline-offset-4 hover:underline"
            >
              kontakt@wellbotany.pl
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Twoje uprawnienia</h2>
          <p className="mb-2 text-muted-foreground">Przysługuje Ci prawo żądania:</p>
          <ul className="mb-2 list-inside list-disc space-y-1 text-muted-foreground">
            <li>dostępu do Twoich danych osobowych, w tym uzyskania ich kopii,</li>
            <li>sprostowania danych,</li>
            <li>usunięcia danych,</li>
            <li>ograniczenia przetwarzania,</li>
            <li>przeniesienia danych do innego administratora.</li>
          </ul>
          <p className="text-muted-foreground">
            Przysługuje Ci również prawo wniesienia w dowolnym momencie sprzeciwu wobec
            przetwarzania danych opartego na naszym prawnie uzasadnionym interesie (art. 21 ust. 1
            RODO) oraz prawo złożenia skargi do Prezesa Urzędu Ochrony Danych Osobowych, jeśli
            uznasz, że Twoje dane są przetwarzane niezgodnie z prawem.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl">Dane osobowe i cele przetwarzania</h2>
          <div className="space-y-4">
            {purposes.map((p) => (
              <div key={p.title} className="rounded-2xl bg-card p-5 shadow-card">
                <p className="font-semibold text-foreground">{p.title}</p>
                <dl className="mt-2 space-y-2 text-muted-foreground">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-foreground/70">
                      W jakim celu
                    </dt>
                    <dd>{p.goal}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-foreground/70">
                      Na jakiej podstawie
                    </dt>
                    <dd>
                      <ul className="list-inside list-disc space-y-1">
                        {p.basis.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-foreground/70">
                      Jak długo
                    </dt>
                    <dd>{p.duration}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-foreground/70">
                      Co jeśli nie podasz danych
                    </dt>
                    <dd>{p.consequence}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Publikowanie danych</h2>
          <p className="text-muted-foreground">
            Jeśli zdecydujesz się na opublikowanie opinii lub komentarza, jego treść oraz Twój
            podpis będą widoczne dla innych użytkowników Sklepu. Nie ujawniamy innym użytkownikom
            Twojego adresu e-mail, chyba że sam to zrobisz.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Bezpieczeństwo danych</h2>
          <p className="text-muted-foreground">
            Przetwarzając Twoje dane osobowe stosujemy środki organizacyjne i techniczne zgodne z
            właściwymi przepisami prawa, w tym szyfrowanie połączenia za pomocą certyfikatu SSL.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl">Odbiorcy danych</h2>
          <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-semibold">Działanie</th>
                  <th className="px-4 py-3 font-semibold">Odbiorca danych</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.action} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{r.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.recipient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Dane nie są przekazywane poza Europejski Obszar Gospodarczy. Ponadto Twoje dane mogą
            zostać udostępnione odpowiednim organom publicznym w zakresie, w jakim jesteśmy
            zobowiązani do ich udostępnienia.
          </p>
        </section>

        <p className="text-muted-foreground">
          Informacje o plikach cookies znajdziesz w{" "}
          <Link href="/cookies" className="text-primary underline-offset-4 hover:underline">
            polityce cookies
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
