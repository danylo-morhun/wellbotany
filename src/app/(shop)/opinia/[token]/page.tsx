import type { Metadata } from "next";
import { ReviewForm } from "@/features/reviews/components/ReviewForm";
import { getReviewableOrder, publicName } from "@/features/reviews/lib/queries";

export const metadata: Metadata = {
  title: "Oceń zakupione produkty",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

export default async function OpiniaPage({ params }: Props) {
  const { token } = await params;
  const order = await getReviewableOrder(token);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-heading text-3xl text-foreground">Oceń zakupione produkty</h1>
      {order ? (
        <>
          <p className="mt-3 text-muted-foreground">
            Zamówienie {order.orderNumber}. Twoja opinia pomoże innym klientom – wystarczy ocena w
            gwiazdkach i kilka zdań.
          </p>
          <div className="mt-8">
            <ReviewForm
              token={token}
              suggestedName={publicName(order.customerName)}
              products={order.products}
              existing={order.reviews}
            />
          </div>
        </>
      ) : (
        <p className="mt-4 text-muted-foreground">
          Ten link do opinii wygasł lub jest nieprawidłowy. Jeśli chcesz podzielić się opinią,
          napisz do nas na kontakt@wellbotany.pl.
        </p>
      )}
    </div>
  );
}
