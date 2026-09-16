import { Leaf, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "O nas — Well Botany",
  description:
    "Poznaj Well Botany — polski sklep z certyfikowanymi suplementami diety, witaminami i produktami bio.",
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
            Well Botany to internetowa odsłona zielarni Twoje Zdrowie — od ponad 20 lat prowadzimy
            stacjonarną zielarnię w Kaliszu, a od teraz te same certyfikowane suplementy diety,
            witaminy i produkty bio dostępne są też online.
          </p>
          <p>
            W ofercie znajdziesz m.in. ekologiczne zioła, certyfikowane herbaty, przyprawy, zdrową
            żywność, suplementy diety, kosmetyki naturalne i olejki eteryczne. Współpracujemy ze
            sprawdzonymi producentami, stawiając na jakość, uczciwy skład i rzetelne informacje o
            każdym produkcie — od dawkowania po kraj pochodzenia. Sprzedajemy wyłącznie produkty
            dopuszczone do obrotu w Polsce i oznaczone zgodnie z wymogami GIS.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl">Nasze sklepy stacjonarne</h2>
          <p className="mb-4 text-muted-foreground">
            Poza sklepem internetowym zapraszamy do dwóch punktów stacjonarnych zielarni Twoje
            Zdrowie w Kaliszu — tam też pomożemy dobrać produkty do Twoich potrzeb.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <p className="font-semibold text-foreground">Zielarnia Twoje Zdrowie</p>
              <p className="text-muted-foreground">ul. Polna 102, 62-800 Kalisz</p>
            </div>
            <div className="rounded-2xl bg-card p-5 shadow-card">
              <p className="font-semibold text-foreground">Zielarnia Twoje Zdrowie</p>
              <p className="text-muted-foreground">ul. Młynarska 69, 62-800 Kalisz</p>
            </div>
          </div>
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
