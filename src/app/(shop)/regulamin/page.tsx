import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Regulamin — Well Botany",
  description: "Regulamin sklepu internetowego Well Botany.",
};

const sections = [
  {
    title: "§1 Postanowienia ogólne",
    items: [
      "Sklep internetowy Well Botany prowadzony jest przez Zielarnia Kaliska II Sp. z o.o., ul. Polna 102, 62-800 Kalisz, NIP: 6182203142, REGON: 528620490, e-mail: kontakt@wellbotany.pl, tel. +48 797 771 703.",
      "Sklep internetowy Well Botany prowadzi sprzedaż detaliczną suplementów diety, witamin i produktów bio za pośrednictwem sieci Internet.",
      "Niniejszy regulamin określa zasady korzystania ze sklepu, składania zamówień, dostarczania towarów, uprawnienia kupującego oraz zasady reklamacji.",
      "Złożenie zamówienia oznacza akceptację niniejszego regulaminu.",
    ],
  },
  {
    title: "§2 Składanie zamówień",
    items: [
      "Zamówienia można składać 24 godziny na dobę przez cały rok za pośrednictwem strony internetowej.",
      "Warunkiem realizacji zamówienia jest prawidłowe wypełnienie formularza zamówienia oraz podanie danych kontaktowych.",
      "Ceny towarów podane są w złotych polskich (PLN) i zawierają podatek VAT.",
      "Na życzenie klienta wystawiamy faktury VAT — wymagane jest podanie numeru NIP przy składaniu zamówienia.",
    ],
  },
  {
    title: "§3 Płatności",
    items: [
      "Płatności obsługiwane są przez serwis Przelewy24 (BLIK, Apple Pay, Google Pay, przelew bankowy).",
      "Realizacja zamówienia rozpoczyna się po zaksięgowaniu wpłaty.",
    ],
  },
  {
    title: "§4 Dostawa",
    items: [
      "Dostawa realizowana jest przez InPost Paczkomaty, DHL oraz DPD na terenie Polski.",
      "Czas realizacji zamówienia wynosi 1–3 dni robocze od zaksięgowania płatności.",
      "Zamówienia o wartości od 200 zł dostarczamy bezpłatnie.",
    ],
  },
  {
    title: "§5 Zwroty i reklamacje",
    items: [
      "Konsument ma prawo odstąpić od umowy w terminie 14 dni bez podania przyczyny — szczegóły na stronie Zwroty i reklamacje.",
      "Ze względów higienicznych zwrotowi nie podlegają produkty z naruszonym zabezpieczeniem opakowania.",
      "Reklamacje rozpatrujemy w terminie 14 dni od ich otrzymania.",
    ],
  },
  {
    title: "§6 Postanowienia końcowe",
    items: [
      "Dane osobowe przetwarzane są zgodnie z Polityką prywatności.",
      "W sprawach nieuregulowanych regulaminem zastosowanie mają przepisy Kodeksu cywilnego oraz ustawy o prawach konsumenta.",
      "Suplement diety nie może być stosowany jako substytut zróżnicowanej diety i zdrowego trybu życia.",
    ],
  },
];

export default function RegulaminPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl">Regulamin</h1>

      <div className="space-y-10 text-sm leading-relaxed">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-xl">{section.title}</h2>
            <ul className="list-decimal space-y-2 pl-5 text-muted-foreground">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

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
