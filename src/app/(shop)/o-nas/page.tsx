import { Leaf, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getShopSettings } from "@/features/settings/lib/shop-settings";
import { formatPriceCompact } from "@/lib/format";

export const metadata: Metadata = {
  title: "O nas",
  alternates: { canonical: "/o-nas" },
  description:
    "Poznaj Well Botany — polski sklep z certyfikowanymi suplementami diety, witaminami i produktami bio.",
};

const values = [
  {
    icon: ShieldCheck,
    title: "Certyfikowana jakość",
    text: "Suplementy diety w naszej ofercie są zgłoszone do Głównego Inspektoratu Sanitarnego, a wszystkie produkty pochodzą od sprawdzonych producentów.",
  },
  {
    icon: Leaf,
    title: "Naturalne składniki",
    text: "Wybieramy produkty bez zbędnych sztucznych dodatków, barwników i wypełniaczy.",
  },
  {
    icon: Truck,
    title: "Szybka dostawa",
    text: "Wysyłamy w 24–48 h do paczkomatu, punktu odbioru lub kurierem.",
  },
];

export default async function ONasPage() {
  const { freeShippingThresholdPln } = await getShopSettings();

  return (
    <div className="container mx-auto max-w-prose px-4 py-12">
      <h1 className="mb-8 text-3xl">O nas</h1>

      <div className="space-y-10 text-sm leading-relaxed">
        <section className="space-y-3 text-muted-foreground">
          <p>
            Well Botany to polski sklep internetowy z suplementami diety, witaminami, ziołami i
            produktami bio. Stawiamy na przejrzysty skład, rzetelne opisy i poradniki, które
            pomagają świadomie wybierać.
          </p>
          <p>
            W ofercie znajdziesz m.in. ekologiczne zioła, certyfikowane herbaty, przyprawy, zdrową
            żywność, suplementy diety, kosmetyki naturalne i olejki eteryczne. Współpracujemy ze
            sprawdzonymi producentami, stawiając na jakość, uczciwy skład i rzetelne informacje o
            każdym produkcie — od dawkowania po kraj pochodzenia. Sprzedajemy wyłącznie produkty
            wprowadzone do obrotu w Polsce zgodnie z przepisami.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl">Na czym nam zależy</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {values.map(({ icon, title, text }) => {
              const Icon = icon;
              return (
                <div key={title} className="rounded-2xl bg-card p-5 shadow-card">
                  <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {text}
                    {icon === Truck && freeShippingThresholdPln !== null
                      ? ` Darmowa dostawa od ${formatPriceCompact(freeShippingThresholdPln)}.`
                      : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Masz pytania?</h2>
          <p className="text-muted-foreground">
            Nasz zespół chętnie doradzi w wyborze produktów —{" "}
            <Link href="/kontakt" className="text-primary underline-offset-4 hover:underline">
              skontaktuj się z nami
            </Link>{" "}
            lub zajrzyj do{" "}
            <Link href="/faq" className="text-primary underline-offset-4 hover:underline">
              najczęściej zadawanych pytań
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
