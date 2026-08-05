import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Polityka prywatności — Well Botany",
  description: "Zasady przetwarzania danych osobowych w sklepie Well Botany.",
};

const sections = [
  {
    title: "Administrator danych",
    body: "Administratorem Twoich danych osobowych jest Well Botany z siedzibą w Kaliszu. W sprawach dotyczących danych osobowych możesz skontaktować się z nami pod adresem kontakt@wellbotany.pl.",
  },
  {
    title: "Jakie dane przetwarzamy",
    body: "Przetwarzamy dane podane przy składaniu zamówienia i zakładaniu konta: imię i nazwisko, adres e-mail, numer telefonu, adres dostawy, a w przypadku faktur — nazwę firmy i NIP. Dodatkowo przetwarzamy dane o zamówieniach i podstawowe dane techniczne (adres IP, pliki cookies).",
  },
  {
    title: "Cele i podstawy przetwarzania",
    body: "Dane przetwarzamy w celu realizacji zamówień (art. 6 ust. 1 lit. b RODO), wypełnienia obowiązków prawnych, m.in. księgowych (lit. c), oraz w prawnie uzasadnionym interesie — obsługi reklamacji i zapewnienia bezpieczeństwa sklepu (lit. f).",
  },
  {
    title: "Odbiorcy danych",
    body: "Dane przekazujemy wyłącznie podmiotom niezbędnym do realizacji zamówienia: operatorowi płatności Przelewy24, firmom kurierskim (InPost, DHL, DPD) oraz dostawcom usług IT obsługującym sklep. Nie sprzedajemy danych osobowych.",
  },
  {
    title: "Okres przechowywania",
    body: "Dane zamówień przechowujemy przez okres wymagany przepisami podatkowymi (5 lat). Dane konta — do czasu jego usunięcia. Dane z koszyka gości — maksymalnie 30 dni.",
  },
  {
    title: "Twoje prawa",
    body: "Masz prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia oraz wniesienia sprzeciwu. Przysługuje Ci również skarga do Prezesa Urzędu Ochrony Danych Osobowych.",
  },
];

export default function PolitykaPrywatnosciPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl">Polityka prywatności</h1>

      <div className="space-y-10 text-sm leading-relaxed">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-xl">{section.title}</h2>
            <p className="text-muted-foreground">{section.body}</p>
          </section>
        ))}

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
