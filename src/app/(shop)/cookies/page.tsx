import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Polityka cookies — Well Botany",
  description: "Informacje o plikach cookies używanych w sklepie Well Botany.",
};

const cookieTypes = [
  {
    name: "Niezbędne",
    purpose: "Utrzymanie sesji, zawartości koszyka i listy ulubionych, bezpieczeństwo logowania.",
    duration: "Sesja lub do 30 dni",
  },
  {
    name: "Funkcjonalne",
    purpose: "Zapamiętywanie preferencji, np. języka.",
    duration: "Do 12 miesięcy",
  },
];

export default function CookiesPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl">Polityka cookies</h1>

      <div className="space-y-10 text-sm leading-relaxed">
        <section>
          <h2 className="mb-3 text-xl">Czym są pliki cookies</h2>
          <p className="text-muted-foreground">
            Pliki cookies to niewielkie pliki tekstowe zapisywane na Twoim urządzeniu podczas
            korzystania ze sklepu. Używamy ich wyłącznie do zapewnienia prawidłowego działania
            sklepu — przede wszystkim do utrzymania koszyka i sesji logowania.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Jakie cookies stosujemy</h2>
          <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-semibold">Rodzaj</th>
                  <th className="px-4 py-3 font-semibold">Cel</th>
                  <th className="px-4 py-3 font-semibold">Okres</th>
                </tr>
              </thead>
              <tbody>
                {cookieTypes.map((row) => (
                  <tr key={row.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.purpose}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Zarządzanie cookies</h2>
          <p className="text-muted-foreground">
            Możesz zarządzać plikami cookies w ustawieniach swojej przeglądarki — w tym blokować je
            lub usuwać. Pamiętaj, że zablokowanie niezbędnych cookies uniemożliwi składanie zamówień
            (koszyk nie będzie zapamiętywany).
          </p>
        </section>

        <p className="text-muted-foreground">
          Więcej o przetwarzaniu danych w{" "}
          <Link
            href="/polityka-prywatnosci"
            className="text-primary underline-offset-4 hover:underline"
          >
            polityce prywatności
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
