import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Regulamin — Well Botany",
  description: "Regulamin sklepu internetowego Well Botany.",
};

const definitions = [
  {
    term: "Dni robocze",
    body: "dni od poniedziałku do piątku, z wyjątkiem dni ustawowo wolnych od pracy.",
  },
  { term: "Konsument", body: "konsument w rozumieniu przepisów Kodeksu cywilnego." },
  {
    term: "Konto",
    body: "nieodpłatna funkcja Sklepu, dzięki której Kupujący może założyć w Sklepie swoje indywidualne konto.",
  },
  { term: "Kupujący", body: "każdy podmiot kupujący w Sklepie." },
  { term: "Kupujący uprzywilejowany", body: "Konsument lub Przedsiębiorca uprzywilejowany." },
  {
    term: "Przedsiębiorca uprzywilejowany",
    body: "osoba fizyczna zawierająca ze Sprzedawcą umowę bezpośrednio związaną z jej działalnością gospodarczą, niemającą dla niej charakteru zawodowego.",
  },
  { term: "Regulamin", body: "niniejszy regulamin." },
  {
    term: "Sklep",
    body: "sklep internetowy Well Botany, prowadzony przez Sprzedawcę pod adresem wellbotany.pl.",
  },
  {
    term: "Sprzedawca",
    body: "ZIELARNIA KALISKA II SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ z siedzibą w Kaliszu, wpisana do rejestru przedsiębiorców Krajowego Rejestru Sądowego pod numerem KRS 0001105400, NIP 6182203142, REGON 528620490, adres: ul. Polna 102, 62-800 Kalisz.",
  },
];

export default function RegulaminPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl">Regulamin sklepu internetowego</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Określa m.in. zasady zawierania umów sprzedaży poprzez Sklep oraz najważniejsze informacje o
        Sprzedawcy i prawach Konsumenta. Postanowienia dotyczące Przedsiębiorcy uprzywilejowanego
        mają zastosowanie do umów zawartych od dnia 1 stycznia 2021 r.
      </p>

      <div className="space-y-10 text-sm leading-relaxed">
        <section>
          <h2 className="mb-3 text-xl">§1 Definicje</h2>
          <dl className="space-y-2 text-muted-foreground">
            {definitions.map((d) => (
              <div key={d.term}>
                <dt className="font-semibold text-foreground">{d.term}</dt>
                <dd>{d.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§2 Kontakt ze Sprzedawcą</h2>
          <ul className="space-y-1 text-muted-foreground">
            <li>Adres pocztowy: ul. Polna 102, 62-800 Kalisz</li>
            <li>
              Adres e-mail:{" "}
              <a
                href="mailto:kontakt@wellbotany.pl"
                className="text-primary underline-offset-4 hover:underline"
              >
                kontakt@wellbotany.pl
              </a>
            </li>
            <li>Telefon: +48 797 771 703</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§3 Wymogi techniczne</h2>
          <ul className="list-inside list-decimal space-y-2 text-muted-foreground">
            <li>
              Dla prawidłowego funkcjonowania Sklepu potrzebne jest urządzenie z dostępem do
              Internetu oraz przeglądarka internetowa obsługująca JavaScript i pliki cookies.
            </li>
            <li>
              Dla złożenia zamówienia, poza wymogami określonymi w ust. 1, niezbędne jest aktywne
              konto e-mail.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§4 Zakupy w Sklepie</h2>
          <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
            <li>Ceny towarów widoczne w Sklepie są całkowitymi cenami za towar.</li>
            <li>
              Na całkowitą cenę zamówienia składają się: cena za towar oraz, jeśli ma to
              zastosowanie, koszty dostawy towaru.
            </li>
            <li>Wybrany towar należy dodać do koszyka w Sklepie.</li>
            <li>
              Następnie Kupujący wybiera sposób dostawy oraz metodę płatności, a także podaje dane
              niezbędne do zrealizowania zamówienia.
            </li>
            <li>
              Zamówienie zostaje złożone w momencie potwierdzenia jego treści i zaakceptowania
              Regulaminu przez Kupującego — co jest tożsame z zawarciem umowy sprzedaży.
            </li>
            <li>
              Sprzedawca przekaże Kupującemu uprzywilejowanemu potwierdzenie zawarcia umowy na
              trwałym nośniku najpóźniej w momencie dostarczenia towaru.
            </li>
            <li>
              Kupujący może założyć Konto lub dokonywać zakupów bez rejestracji, podając swoje dane
              przy każdym zamówieniu.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§5 Płatności</h2>
          <p className="mb-2 text-muted-foreground">Za złożone zamówienie można zapłacić:</p>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>BLIK,</li>
            <li>kartą płatniczą (Visa, Mastercard),</li>
            <li>Apple Pay lub Google Pay,</li>
            <li>szybkim przelewem online,</li>
            <li>zwykłym przelewem na rachunek bankowy Sprzedawcy.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            W przypadku wybrania płatności z góry, za zamówienie należy zapłacić w terminie 3 Dni
            roboczych od jego złożenia. Zwrot środków za transakcję kartą płatniczą następuje na
            rachunek bankowy przypisany do karty Kupującego.
          </p>
          <p className="mt-2 text-muted-foreground">
            Kupujący dokonując zakupów akceptuje stosowanie faktur elektronicznych przez Sprzedawcę.
            Kupujący ma prawo wycofać swoją akceptację.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§6 Realizacja zamówienia</h2>
          <ul className="list-inside list-decimal space-y-2 text-muted-foreground">
            <li>Sprzedawca jest obowiązany do dostarczenia towaru zgodnego z umową.</li>
            <li>
              W przypadku płatności z góry, Sprzedawca przystąpi do realizacji zamówienia po jego
              opłaceniu.
            </li>
            <li>
              Jeśli w ramach jednego zamówienia Kupujący zakupił towary o różnym terminie
              realizacji, zamówienie zostanie zrealizowane w terminie właściwym dla towaru o
              najdłuższym terminie.
            </li>
            <li>Towar dostarczany jest wyłącznie na terytorium Rzeczypospolitej Polskiej.</li>
            <li>
              Dostawa realizowana jest za pośrednictwem Paczkomatów InPost, kuriera InPost, Orlen
              Paczki, DHL oraz DPD — szczegóły na stronie{" "}
              <Link href="/dostawa" className="text-primary underline-offset-4 hover:underline">
                Dostawa i płatność
              </Link>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§7 Prawo odstąpienia od umowy</h2>
          <p className="mb-2 text-muted-foreground">
            Kupujący uprzywilejowany ma prawo odstąpić od umowy zawartej ze Sprzedawcą, z
            zastrzeżeniem §8 Regulaminu, w terminie 14 dni bez podania jakiejkolwiek przyczyny.
            Termin wygasa po upływie 14 dni od dnia, w którym Kupujący uprzywilejowany (lub wskazana
            przez niego osoba trzecia) wszedł w posiadanie towaru.
          </p>
          <p className="mb-2 text-muted-foreground">
            Aby skorzystać z tego prawa, należy poinformować Sprzedawcę o decyzji o odstąpieniu w
            drodze jednoznacznego oświadczenia (np. pismo pocztą lub e-mail na adres z §2). Można
            skorzystać z wzoru formularza odstąpienia dostępnego na stronie{" "}
            <Link href="/zwroty" className="text-primary underline-offset-4 hover:underline">
              Zwroty i reklamacje
            </Link>
            , jednak nie jest to obowiązkowe. Do zachowania terminu wystarczy wysłanie informacji
            przed jego upływem.
          </p>
          <h3 className="mb-2 mt-4 font-semibold text-foreground">Skutki odstąpienia od umowy</h3>
          <ul className="list-inside list-disc space-y-2 text-muted-foreground">
            <li>
              Sprzedawca zwraca wszystkie otrzymane płatności, w tym koszty dostarczenia towaru (z
              wyjątkiem dodatkowych kosztów wynikających z wybrania droższego niż najtańszy zwykły
              sposób dostawy), niezwłocznie i nie później niż 14 dni od dnia poinformowania
              Sprzedawcy o odstąpieniu.
            </li>
            <li>
              Zwrot płatności następuje tym samym sposobem, jaki zastosowano w pierwotnej
              transakcji, chyba że Kupujący uprzywilejowany zgodzi się na inne rozwiązanie — bez
              żadnych dodatkowych opłat.
            </li>
            <li>
              Sprzedawca może wstrzymać się ze zwrotem do czasu otrzymania towaru lub dowodu jego
              odesłania, w zależności co nastąpi wcześniej.
            </li>
            <li>
              Towar należy odesłać na adres: ul. Polna 102, 62-800 Kalisz, niezwłocznie i nie
              później niż 14 dni od dnia poinformowania o odstąpieniu. Termin jest zachowany, jeśli
              towar zostanie odesłany przed jego upływem.
            </li>
            <li>Bezpośrednie koszty zwrotu towaru ponosi Kupujący uprzywilejowany.</li>
            <li>
              Kupujący uprzywilejowany odpowiada tylko za zmniejszenie wartości towaru wynikające z
              korzystania z niego w sposób inny niż konieczny do stwierdzenia jego charakteru, cech
              i funkcjonowania.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§8 Wyjątki od prawa odstąpienia od umowy</h2>
          <p className="mb-2 text-muted-foreground">
            Prawo odstąpienia, o którym mowa w §7, nie przysługuje w odniesieniu do umowy:
          </p>
          <ul className="list-inside list-disc space-y-2 text-muted-foreground">
            <li>
              w której przedmiotem świadczenia jest rzecz nieprefabrykowana, wyprodukowana według
              specyfikacji Kupującego uprzywilejowanego lub służąca zaspokojeniu jego
              zindywidualizowanych potrzeb;
            </li>
            <li>
              w której przedmiotem świadczenia jest rzecz szybko psująca się lub o krótkim terminie
              przydatności;
            </li>
            <li>
              <strong className="text-foreground">
                w której przedmiotem świadczenia jest rzecz dostarczana w zapieczętowanym
                opakowaniu, której po otwarciu opakowania nie można zwrócić ze względu na ochronę
                zdrowia lub ze względów higienicznych, jeżeli opakowanie zostało otwarte po
                dostarczeniu
              </strong>{" "}
              — dotyczy to w szczególności suplementów diety i produktów spożywczych;
            </li>
            <li>
              w której przedmiotem świadczenia są rzeczy, które po dostarczeniu, ze względu na swój
              charakter, zostają nierozłącznie połączone z innymi rzeczami;
            </li>
            <li>
              w której cena lub wynagrodzenie zależy od wahań na rynku finansowym, nad którymi
              Sprzedawca nie sprawuje kontroli.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§9 Reklamacje i zgodność towaru z umową</h2>
          <ul className="list-inside list-decimal space-y-2 text-muted-foreground">
            <li>
              Sprzedawca odpowiada wobec Konsumenta oraz Przedsiębiorcy uprzywilejowanego za brak
              zgodności towaru z umową istniejący w chwili jego dostarczenia i ujawniony w ciągu 2
              lat od tej chwili, chyba że dłuższy jest wskazany termin przydatności towaru do
              użycia.
            </li>
            <li>
              W przypadku braku zgodności towaru z umową Kupujący uprzywilejowany może żądać naprawy
              lub wymiany, a w przypadkach określonych przepisami — także obniżenia ceny albo
              odstąpienia od umowy.
            </li>
            <li>Reklamację można złożyć na adres pocztowy lub elektroniczny wskazany w §2.</li>
            <li>
              Koszty odebrania towaru oraz naprawy lub wymiany ponosi Sprzedawca. Sprzedawca udzieli
              odpowiedzi na reklamację Konsumenta w terminie 14 dni od jej otrzymania.
            </li>
          </ul>
          <h3 className="mb-2 mt-4 font-semibold text-foreground">
            Pozasądowe sposoby rozpatrywania reklamacji i dochodzenia roszczeń
          </h3>
          <p className="text-muted-foreground">
            Konsument może skorzystać z bezpłatnej pomocy miejskiego lub powiatowego rzecznika
            konsumentów, właściwego Wojewódzkiego Inspektoratu Inspekcji Handlowej oraz platformy
            ODR pod adresem{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              ec.europa.eu/consumers/odr
            </a>
            . Więcej informacji na stronie{" "}
            <a
              href="https://polubowne.uokik.gov.pl/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              polubowne.uokik.gov.pl
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§10 Dane osobowe</h2>
          <p className="text-muted-foreground">
            Administratorem danych osobowych przekazanych przez Kupującego jest Sprzedawca.
            Szczegółowe informacje dotyczące przetwarzania danych osobowych — w tym o celach,
            podstawach przetwarzania oraz odbiorcach danych — znajdują się w{" "}
            <Link
              href="/polityka-prywatnosci"
              className="text-primary underline-offset-4 hover:underline"
            >
              Polityce prywatności
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">§11 Zastrzeżenia</h2>
          <ul className="list-inside list-disc space-y-2 text-muted-foreground">
            <li>Zakazane jest dostarczanie przez Kupującego treści o charakterze bezprawnym.</li>
            <li>
              Każde złożone w Sklepie zamówienie stanowi odrębną umowę sprzedaży i wymaga osobnej
              akceptacji Regulaminu.
            </li>
            <li>Umowy zawierane na podstawie Regulaminu zawierane są w języku polskim.</li>
            <li>
              W przypadku ewentualnego sporu z Kupującym niebędącym Kupującym uprzywilejowanym,
              sądem właściwym będzie sąd właściwy dla siedziby Sprzedawcy.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Regulamin prowadzenia Konta</h2>
          <p className="mb-2 text-muted-foreground">
            Założenie Konta jest całkowicie dobrowolne. Konto daje Kupującemu dodatkowe możliwości:
            przeglądanie historii zamówień, sprawdzenie statusu zamówienia oraz samodzielną edycję
            danych. Umowa o prowadzenie Konta zawierana jest na czas nieokreślony z chwilą założenia
            Konta.
          </p>
          <p className="mb-2 text-muted-foreground">
            Kupujący może bez ponoszenia jakichkolwiek kosztów w każdym czasie zrezygnować z Konta,
            wysyłając rezygnację na adres{" "}
            <a
              href="mailto:kontakt@wellbotany.pl"
              className="text-primary underline-offset-4 hover:underline"
            >
              kontakt@wellbotany.pl
            </a>{" "}
            — skutkuje to niezwłocznym usunięciem Konta.
          </p>
          <p className="text-muted-foreground">
            O planowanej zmianie niniejszego Regulaminu Konta Kupujący zostanie poinformowany co
            najmniej 7 dni przed jej wejściem w życie, wiadomością e-mail wysłaną na adres
            przypisany do Konta. Brak sprzeciwu do chwili wejścia zmiany w życie uznaje się za jej
            akceptację.
          </p>
        </section>

        <p className="text-muted-foreground">
          Zobacz też:{" "}
          <Link href="/zwroty" className="text-primary underline-offset-4 hover:underline">
            Zwroty i reklamacje
          </Link>
          {" · "}
          <Link
            href="/polityka-prywatnosci"
            className="text-primary underline-offset-4 hover:underline"
          >
            Polityka prywatności
          </Link>
        </p>
      </div>
    </main>
  );
}
