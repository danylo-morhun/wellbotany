import type { Metadata } from "next";
import Link from "next/link";
import { isP24Enabled } from "@/features/przelewy24/lib/config";
import {
  GOOGLE_ADS_ENABLED,
  MARKETING_ENABLED,
  MARKETING_TOOLS,
  META_ENABLED,
} from "@/lib/marketing-config";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  alternates: { canonical: "/polityka-prywatnosci" },
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
    title: "Newsletter",
    goal: "wysyłanie kodu rabatowego powitalnego oraz informacji o promocjach, nowościach i porad na Twój adres e-mail",
    basis: [
      "Twoja zgoda wyrażona przy zapisie (art. 6 ust. 1 lit. a RODO oraz art. 398 Prawa komunikacji elektronicznej)",
    ],
    duration:
      "do wycofania zgody (link „wypisz się” w każdym newsletterze, odpowiedź na newsletter lub wiadomość do nas), a dodatkowo do upływu okresu dochodzenia roszczeń.",
    consequence: "brak — sklep działa w pełni bez zapisu",
  },
  {
    title: "Opinie o produktach",
    goal: "publikacja Twojej opinii z wybranym przez Ciebie podpisem i potwierdzenie, że pochodzi od osoby, która kupiła produkt",
    basis: ["Twoja zgoda wyrażona przez wysłanie opinii (art. 6 ust. 1 lit. a RODO)"],
    duration: "do wycofania zgody — usuniemy wtedy opinię ze Sklepu.",
    consequence: "brak — opinia jest dobrowolna",
  },
  {
    title: "Statystyki korzystania ze Sklepu",
    goal: "analiza ruchu i zakupów w Sklepie za pomocą Google Analytics (identyfikatory pseudonimowe, bez celów reklamowych)",
    basis: ["Twoja zgoda wyrażona w banerze cookies (art. 6 ust. 1 lit. a RODO)"],
    duration:
      "do wycofania zgody (przycisk „Ustawienia cookies” w stopce), nie dłużej niż 14 miesięcy w Google Analytics.",
    consequence: "brak — sklep działa w pełni bez tej zgody",
  },
  ...(MARKETING_ENABLED
    ? [
        {
          title: "Pomiar skuteczności reklam",
          goal: `sprawdzanie, które nasze reklamy w ${MARKETING_TOOLS} prowadzą do zamówień, i optymalizacja ich wyświetlania. Po złożeniu zamówienia przekazujemy jego numer i wartość, identyfikator kliknięcia w reklamę, adres IP, dane przeglądarki oraz zahashowany (zaszyfrowany jednokierunkowo) adres e-mail i numer telefonu — nigdy informacji o kupionych produktach. Nie tworzymy list remarketingowych.`,
          basis: ["Twoja zgoda na cookies marketingowe (art. 6 ust. 1 lit. a RODO)"],
          duration:
            "do wycofania zgody (przycisk „Ustawienia cookies” w stopce); dane przekazane przed wycofaniem Google i Meta przechowują według własnych zasad.",
          consequence: "brak — sklep działa w pełni bez tej zgody",
        },
      ]
    : []),
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
    recipient:
      "dostawcy hostingu i infrastruktury Sklepu: Vercel Inc. (hosting), Neon Inc. (baza danych, serwery we Frankfurcie), Upstash Inc. (ochrona przed nadużyciami — limit zapytań na adres IP), Functional Software Inc. — Sentry (rejestr błędów), Cloudinary Ltd. (zdjęcia produktów)",
  },
  {
    action: "złożenie zamówienia w Sklepie",
    recipient: "operator płatności Przelewy24 (PayPro S.A.)",
    onlinePaymentsOnly: true,
  },
  {
    action: "dostawa zamówienia",
    recipient: "pośrednik w nadawaniu przesyłek oraz przewoźnik wybrany przez Ciebie w koszyku",
  },
  {
    action: "statystyki korzystania ze Sklepu (tylko po wyrażeniu zgody na cookies analityczne)",
    recipient: "Google Ireland Ltd. (Google Analytics)",
  },
  ...(GOOGLE_ADS_ENABLED
    ? [
        {
          action: "pomiar skuteczności reklam (tylko po wyrażeniu zgody na cookies marketingowe)",
          recipient: "Google Ireland Ltd. (Google Ads)",
        },
      ]
    : []),
  ...(META_ENABLED
    ? [
        {
          action:
            "pomiar skuteczności reklam na Facebooku i Instagramie (tylko po wyrażeniu zgody na cookies marketingowe)",
          recipient:
            "Meta Platforms Ireland Ltd. — przy zbieraniu i przekazaniu tych danych jesteśmy z Meta współadministratorami (art. 26 RODO, facebook.com/legal/controller_addendum); dalsze przetwarzanie przez Meta opisuje facebook.com/privacy/policy",
        },
      ]
    : []),
  {
    action: "wysyłka e-maili (potwierdzenia zamówień, newsletter)",
    recipient: "Resend Inc. (wysyłka e-maili)",
  },
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
    <div className="container mx-auto max-w-3xl px-4 py-12">
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
                {recipients
                  .filter((r) => !r.onlinePaymentsOnly || isP24Enabled())
                  .map((r) => (
                    <tr key={r.action} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{r.action}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.recipient}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Część odbiorców to firmy z siedzibą w USA (Vercel, Neon, Upstash, Sentry, Resend,{" "}
            {META_ENABLED ? "Google, Meta" : "Google"}), więc dane mogą być przekazywane do USA — na
            podstawie decyzji Komisji Europejskiej stwierdzającej odpowiedni stopień ochrony (EU-US
            Data Privacy Framework) wobec firm, które się w nim certyfikowały, a w pozostałych
            przypadkach na podstawie standardowych klauzul umownych zatwierdzonych przez Komisję
            (art. 46 ust. 2 lit. c RODO). Cloudinary ma siedzibę w Izraelu, wobec którego Komisja
            wydała decyzję o odpowiednim stopniu ochrony. Kopię zabezpieczeń możesz otrzymać, pisząc
            do nas. Ponadto Twoje dane mogą zostać udostępnione odpowiednim organom publicznym w
            zakresie, w jakim jesteśmy zobowiązani do ich udostępnienia.
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
    </div>
  );
}
