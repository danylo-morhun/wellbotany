import type { Metadata } from "next";
import Link from "next/link";
import { WithdrawalForm } from "@/features/withdrawal/components/WithdrawalForm";

export const metadata: Metadata = {
  title: "Odstąpienie od umowy",
  alternates: { canonical: "/odstapienie" },
  description: "Odstąp od umowy online — w 14 dni od otrzymania zamówienia, bez podania przyczyny.",
};

type Props = { searchParams: Promise<{ zamowienie?: string }> };

export default async function OdstapieniePage({ searchParams }: Props) {
  const { zamowienie } = await searchParams;
  return (
    <div className="container mx-auto max-w-prose px-4 py-12">
      <h1 className="mb-4 text-3xl">Odstąpienie od umowy</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Masz 14 dni od otrzymania zamówienia, aby odstąpić od umowy bez podania przyczyny. Wypełnij
        formularz — od razu wyślemy potwierdzenie na Twój e-mail. Możesz też napisać do nas w
        dowolnej formie. Zasady zwrotu znajdziesz na stronie{" "}
        <Link href="/zwroty" className="text-primary underline-offset-4 hover:underline">
          Zwroty i reklamacje
        </Link>
        .
      </p>
      <WithdrawalForm orderNumber={zamowienie?.slice(0, 40) ?? ""} />
    </div>
  );
}
