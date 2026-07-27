import type { Metadata } from "next";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Zwroty i reklamacje — Twoje Zdrowie",
  description: "Informacje o prawie odstąpienia od umowy, zwrotach i reklamacjach.",
};

export default function ZwrotyPage() {
  return (
    <main className="container mx-auto max-w-prose px-4 py-12">
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
              href="mailto:kontakt@twojezdrowie.pl"
              className="text-primary underline-offset-4 hover:underline"
            >
              kontakt@twojezdrowie.pl
            </a>{" "}
            przed upływem terminu. Wzór formularza odstąpienia dostępny jest poniżej.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Jak złożyć zwrot — krok po kroku</h2>
          <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
            <li>
              Wyślij e-mail na{" "}
              <a
                href="mailto:kontakt@twojezdrowie.pl"
                className="text-primary underline-offset-4 hover:underline"
              >
                kontakt@twojezdrowie.pl
              </a>{" "}
              z numerem zamówienia i informacją, które produkty zwracasz.
            </li>
            <li>Zapakuj produkty starannie w oryginalne opakowanie (o ile to możliwe).</li>
            <li>
              Dołącz do paczki wypełniony formularz zwrotu (dostępny poniżej) lub kopię
              faktury/paragonu.
            </li>
            <li>
              Wyślij paczkę na wskazany przez nas adres zwrotny (otrzymasz go w odpowiedzi e-mail).
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
            złożyć reklamację z tytułu rękojmi. Reklamację przyjmujemy:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            <li>
              E-mailem:{" "}
              <a
                href="mailto:kontakt@twojezdrowie.pl"
                className="text-primary underline-offset-4 hover:underline"
              >
                kontakt@twojezdrowie.pl
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
            Po otrzymaniu i sprawdzeniu zwróconego towaru dokonamy zwrotu należności w terminie
            <strong className="text-foreground"> do 14 dni</strong> od daty otrzymania przesyłki
            zwrotnej. Zwrot realizowany jest tą samą metodą płatności, którą wybrano przy zakupie.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Produkty bez prawa zwrotu</h2>
          <p className="text-muted-foreground">
            Zgodnie z art. 38 pkt 5 ustawy o prawach konsumenta, prawo odstąpienia nie przysługuje w
            przypadku produktów dostarczonych w zapieczętowanym opakowaniu, których po otwarciu nie
            można zwrócić ze względu na ochronę zdrowia lub ze względów higienicznych. Dotyczy to
            suplementów diety i żywności funkcjonalnej z naruszonym opakowaniem.
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
            <p className="mt-2">Adresat: Twoje Zdrowie, kontakt@twojezdrowie.pl</p>
            <p className="mt-2">
              Niniejszym informuję o moim odstąpieniu od umowy sprzedaży następujących towarów:
              [nazwa towaru]
            </p>
            <p className="mt-1">Data zawarcia umowy / data odbioru: [data]</p>
            <p className="mt-1">Numer zamówienia: [numer]</p>
            <p className="mt-1">Imię i nazwisko: [imię i nazwisko]</p>
            <p className="mt-1">Adres: [adres]</p>
            <p className="mt-2">Data: [data] &nbsp;&nbsp; Podpis: ___________________</p>
          </div>
        </section>
      </div>
    </main>
  );
}
