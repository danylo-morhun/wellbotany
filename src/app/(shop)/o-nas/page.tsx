import { Leaf, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O nas — Twoje Zdrowie",
  description:
    "Poznaj Twoje Zdrowie — polski sklep z certyfikowanymi suplementami diety, witaminami i produktami bio.",
};

const values = [
  {
    icon: ShieldCheck,
    title: "Certyfikowana jakość",
    text: "Każdy produkt w naszej ofercie posiada atest GIS/Sanepid i pochodzi od sprawdzonych producentów.",
  },
  {
    icon: Leaf,
    title: "Naturalne składniki",
    text: "Wybieramy produkty bez zbędnych sztucznych dodatków, barwników i wypełniaczy.",
  },
  {
    icon: Truck,
    title: "Szybka dostawa",
    text: "Wysyłamy w 24h przez InPost Paczkomaty, DHL i DPD. Darmowa dostawa od 200 zł.",
  },
];

export default function ONasPage() {
  return (
    <main className="container mx-auto max-w-prose px-4 py-12">
      <h1 className="mb-8 text-3xl">O nas</h1>

      <div className="space-y-10 text-sm leading-relaxed">
        <section className="space-y-3 text-muted-foreground">
          <p>
            Twoje Zdrowie to polski sklep internetowy z certyfikowanymi suplementami diety,
            witaminami i produktami bio. Powstał z prostego przekonania: dbanie o zdrowie nie
            powinno wymagać przedzierania się przez marketingowe obietnice.
          </p>
          <p>
            Zamiast tego stawiamy na sprawdzony skład, uczciwe ceny i rzetelne informacje o każdym
            produkcie — od dawkowania po kraj pochodzenia. Sprzedajemy wyłącznie produkty
            dopuszczone do obrotu w Polsce i oznaczone zgodnie z wymogami GIS.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl">Na czym nam zależy</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {values.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-card p-5 shadow-card">
                <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
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
    </main>
  );
}
