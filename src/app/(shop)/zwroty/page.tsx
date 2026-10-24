import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { SELLER } from "@/lib/seller";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Zwroty i reklamacje",
  alternates: { canonical: "/zwroty" },
  description: "Informacje o prawie odstąpienia od umowy, zwrotach i reklamacjach.",
};

export default function ZwrotyPage() {
  return (
    <div className="container mx-auto max-w-prose px-4 py-12">
      <h1 className="mb-8 text-3xl">Zwroty i reklamacje</h1>

      <div className="space-y-10 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="mb-3 text-xl">Prawo do odstąpienia od umowy</h2>
          <p className="text-muted-foreground">
            Zgodnie z ustawą z dnia 30 maja 2014 r. o prawach konsumenta (Dz.U. 2014 poz. 827) masz
            prawo odstąpić od umowy zawartej na odległość bez podania przyczyny w terminie
            <strong className="text-foreground"> 14 dni</strong> od dnia otrzymania przesyłki.
          </p>
          <p className="mt-2 text-muted-foreground">
            Aby skorzystać z prawa odstąpienia, poinformuj nas o swojej decyzji drogą e-mailową na
            adres{" "}
            <a
              href="mailto:kontakt@wellbotany.pl"
              className="text-primary underline-offset-4 hover:underline"
            >
              kontakt@wellbotany.pl
            </a>{" "}
            przed upływem terminu albo skorzystaj z formularza online — potwierdzenie otrzymasz od
            razu na e-mail. Wzór formularza odstąpienia do wydruku znajdziesz poniżej.
          </p>
          <Link
            href="/odstapienie"
            className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
          >
            Odstąp od umowy tutaj
          </Link>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Jak złożyć zwrot — krok po kroku</h2>
          <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
            <li>
              Wyślij e-mail na{" "}
              <a
                href="mailto:kontakt@wellbotany.pl"
                className="text-primary underline-offset-4 hover:underline"
              >
                kontakt@wellbotany.pl
              </a>{" "}
              z numerem zamówienia i informacją, które produkty zwracasz.
            </li>
            <li>Zapakuj produkty starannie w oryginalne opakowanie (o ile to możliwe).</li>
            <li>
              Dołącz do paczki wypełniony formularz zwrotu (dostępny poniżej) lub kopię
              faktury/paragonu.
            </li>
            <li>
              Odeślij paczkę w ciągu 14 dni od poinformowania nas o odstąpieniu na adres:{" "}
              {SELLER.legalName}, {SELLER.address}.
            </li>
            <li>
              Koszty przesyłki zwrotnej ponosi Kupujący, z wyjątkiem przypadku wadliwego towaru.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Jak złożyć reklamację</h2>
          <p className="text-muted-foreground">
            Jeśli otrzymany produkt jest uszkodzony, niezgodny z opisem lub wadliwy, masz prawo
            złożyć reklamację z tytułu niezgodności towaru z umową. Reklamację przyjmujemy:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            <li>
              E-mailem:{" "}
              <a
                href="mailto:kontakt@wellbotany.pl"
                className="text-primary underline-offset-4 hover:underline"
              >
                kontakt@wellbotany.pl
              </a>
            </li>
            <li>Podaj numer zamówienia, opis wady i zdjęcia (jeśli dotyczy).</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Rozpatrzymy reklamację w ciągu 14 dni kalendarzowych od jej otrzymania.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Zwrot pieniędzy</h2>
          <p className="text-muted-foreground">
            Zwrócimy wszystkie płatności, w tym koszt dostawy (do wysokości najtańszego zwykłego
            sposobu dostawy w sklepie), niezwłocznie, nie później niż
            <strong className="text-foreground"> 14 dni</strong> od dnia otrzymania Twojego
            oświadczenia o odstąpieniu. Możemy wstrzymać się ze zwrotem do czasu otrzymania towaru
            lub dowodu jego odesłania — w zależności od tego, co nastąpi wcześniej. Zwrot
            realizujemy tą samą metodą płatności, którą wybrano przy zakupie, chyba że wyraźnie
            zgodzisz się na inną.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Produkty bez prawa zwrotu</h2>
          <p className="text-muted-foreground">
            Zgodnie z art. 38 pkt 5 ustawy o prawach konsumenta, prawo odstąpienia nie przysługuje w
            przypadku produktów dostarczonych w zapieczętowanym opakowaniu, których po otwarciu nie
            można zwrócić ze względu na ochronę zdrowia lub ze względów higienicznych, jeżeli
            opakowanie otwarto po dostarczeniu. Dotyczy to suplementów diety, żywności i kosmetyków
            z fabrycznym zabezpieczeniem (plombą, folią) naruszonym po dostawie. Produkty z
            nienaruszonym zabezpieczeniem możesz zwrócić na zwykłych zasadach.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Formularz zwrotu</h2>
          <p className="text-muted-foreground">
            Możesz <PrintButton label="wydrukować lub zapisać jako PDF" /> poniższy wzór formularza
            odstąpienia:
          </p>
          <div className="mt-4 rounded-xl bg-muted p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">WZÓR FORMULARZA ODSTĄPIENIA OD UMOWY</p>
            <p className="mt-1">
              (formularz ten należy wypełnić i odesłać tylko w przypadku chęci odstąpienia od umowy)
            </p>
            <p className="mt-2">
              – Adresat: {SELLER.legalName}, {SELLER.address}, {SELLER.email}
            </p>
            <p className="mt-1">
              – Ja/My(*) niniejszym informuję/informujemy(*) o moim/naszym odstąpieniu od umowy
              sprzedaży następujących towarów: ………
            </p>
            <p className="mt-1">– Data zawarcia umowy(*)/odbioru(*): ………</p>
            <p className="mt-1">– Imię i nazwisko konsumenta(-ów): ………</p>
            <p className="mt-1">– Adres konsumenta(-ów): ………</p>
            <p className="mt-1">
              – Podpis konsumenta(-ów) (tylko jeżeli formularz jest przesyłany w wersji papierowej):
              ………
            </p>
            <p className="mt-1">– Data: ………</p>
            <p className="mt-2">(*) Niepotrzebne skreślić.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
