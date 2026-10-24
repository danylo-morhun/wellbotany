import type { Metadata } from "next";
import { UnsubscribeButton } from "@/features/newsletter/components/UnsubscribeButton";

export const metadata: Metadata = {
  title: "Wypisz się z newslettera",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ e?: string; t?: string }> };

export default async function UnsubscribePage({ searchParams }: Props) {
  const { e = "", t = "" } = await searchParams;
  return (
    <div className="container mx-auto max-w-prose px-4 py-12">
      <h1 className="mb-4 text-3xl">Wypisz się z newslettera</h1>
      {e && t ? (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            Po wypisaniu nie będziemy wysyłać na adres <strong>{e}</strong> promocji ani porad.
            Wiadomości o Twoich zamówieniach dostaniesz jak dotąd.
          </p>
          <UnsubscribeButton email={e} token={t} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Link jest niepełny. Napisz na kontakt@wellbotany.pl, a wypiszemy Cię ręcznie.
        </p>
      )}
    </div>
  );
}
