import type { Metadata } from "next";
import {
  SHIPPING_COSTS,
  SHIPPING_METHODS_BY_PRICE,
  shippingLabel,
} from "@/features/checkout/lib/shipping";
import { getShopSettings } from "@/features/settings/lib/shop-settings";
import { formatPriceCompact } from "@/lib/format";
import { PICKUP_HOLD_DAYS, PICKUP_LOCATIONS } from "@/lib/pickup-locations";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Dostawa i płatność — Well Botany",
  description: "Informacje o metodach dostawy, kosztach i czasie realizacji zamówień.",
};

// Delivery time shown per method. Keyed by string so methods added to
// SHIPPING_COSTS later still render (with the default) before copy is written.
const DELIVERY_TIME: Record<string, string> = {
  PICKUP: "gotowe do odbioru zwykle w 1–2 dni robocze",
};
const DEFAULT_DELIVERY_TIME = "1–2 dni robocze od nadania";

export default async function DostawaPage() {
  const { freeShippingThresholdPln } = await getShopSettings();
  const threshold =
    freeShippingThresholdPln !== null ? formatPriceCompact(freeShippingThresholdPln) : null;

  const methods = SHIPPING_METHODS_BY_PRICE.map(
    (method) => [method, SHIPPING_COSTS[method]] as const,
  );

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
                {methods.map(([method, cost]) => (
                  <tr key={method}>
                    <td className="px-4 py-3">{shippingLabel(method)}</td>
                    <td className="px-4 py-3">
                      {cost === 0 ? "bezpłatnie" : formatPriceCompact(cost)}
                    </td>
                    <td className="px-4 py-3">{DELIVERY_TIME[method] ?? DEFAULT_DELIVERY_TIME}</td>
                  </tr>
                ))}
                {threshold && (
                  <tr>
                    <td className="px-4 py-3 font-medium text-success">Wszystkie metody</td>
                    <td className="px-4 py-3 font-medium text-success">GRATIS</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      przy zamówieniu od {threshold}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {threshold && (
          <section>
            <h2 className="mb-3 text-xl">Darmowa dostawa od {threshold}</h2>
            <p className="text-muted-foreground">
              Przy zamówieniu o wartości {threshold} lub więcej dostawa jest bezpłatna dla
              wszystkich dostępnych metod. Próg liczony jest od wartości produktów po zastosowaniu
              rabatów, bez uwzględnienia kosztów dostawy.
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-xl">Czas realizacji</h2>
          <p className="text-muted-foreground">
            Zamówienia wysyłamy w ciągu 2 dni roboczych od zaksięgowania płatności. Przy płatności
            online (BLIK, karta, szybki przelew) płatność księgowana jest od razu, przy przelewie
            tradycyjnym — zwykle w ciągu 1 dnia roboczego. Czas doręczenia przez przewoźnika to
            najczęściej 1–2 dni robocze od nadania.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Odbiór w paczkomacie lub punkcie</h2>
          <p className="text-muted-foreground">
            Wybierając dostawę do paczkomatu lub punktu odbioru (InPost, Orlen Paczka, DPD, DHL),
            wskazujesz wygodne miejsce na mapie podczas składania zamówienia. Gdy paczka dotrze na
            miejsce, przewoźnik wyśle Ci SMS lub e-mail z informacją o odbiorze. Czas oczekiwania
            paczki w punkcie określa regulamin danego przewoźnika.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Dostawa kurierem</h2>
          <p className="text-muted-foreground">
            Kurier dostarcza paczkę pod wskazany adres, zwykle w dni robocze w godzinach 8:00–18:00.
            Podaj numer telefonu — kurier może skontaktować się z Tobą przed doręczeniem.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Odbiór osobisty w Kaliszu</h2>
          <p className="text-muted-foreground">
            Zamówienie możesz odebrać bezpłatnie w jednym z naszych sklepów stacjonarnych. Gdy
            będzie gotowe, wyślemy Ci e-mail. Zamówienie czeka na odbiór {PICKUP_HOLD_DAYS} dni.
          </p>
          <ul className="mt-3 space-y-3">
            {Object.entries(PICKUP_LOCATIONS).map(([key, location]) => (
              <li key={key} className="rounded-2xl bg-card p-4 shadow-card">
                <p className="font-medium">{location.name}</p>
                <p className="text-muted-foreground">{location.address}</p>
                <p className="text-muted-foreground">{location.hours.join(" · ")}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Śledzenie przesyłki</h2>
          <p className="text-muted-foreground">
            Po nadaniu paczki wyślemy Ci e-mail z numerem przesyłki, dzięki któremu sprawdzisz jej
            status na stronie przewoźnika.
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
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>
              Płatność online przez Przelewy24 — BLIK, karty płatnicze (Visa, Mastercard), Apple
              Pay, Google Pay, szybkie przelewy bankowe. Zamówienie realizujemy od razu po
              potwierdzeniu płatności.
            </li>
            <li>
              Przelew tradycyjny na nasz rachunek bankowy — dane do przelewu otrzymasz po złożeniu
              zamówienia i w e-mailu. Prosimy o wpłatę w ciągu 3 dni roboczych; zamówienie
              realizujemy po zaksięgowaniu wpłaty.
            </li>
            <li>
              Płatność przy odbiorze osobistym w sklepie (gotówką lub kartą) — dostępna tylko przy
              wyborze odbioru osobistego w Kaliszu.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
