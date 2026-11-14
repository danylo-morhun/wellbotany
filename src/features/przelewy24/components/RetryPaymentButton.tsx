"use client";

import { useAction } from "next-safe-action/hooks";
import { Button } from "@/components/ui/button";
import { retryOnlinePayment } from "../actions";

export function RetryPaymentButton({
  orderNumber,
  accessToken,
}: {
  orderNumber: string;
  /** From an e-mail link (`?dostep=`) when this browser has no order cookie */
  accessToken?: string;
}) {
  const { execute, isPending, result } = useAction(retryOnlinePayment, {
    onSuccess: ({ data }) => {
      if (data?.redirectUrl) window.location.assign(data.redirectUrl);
    },
  });
  return (
    <div className="mt-3 space-y-2">
      <Button onClick={() => execute({ orderNumber, accessToken })} disabled={isPending}>
        {isPending ? "Przekierowujemy…" : "Zapłać teraz"}
      </Button>
      {result.serverError && (
        <p role="alert" className="text-sm text-destructive">
          {result.serverError}
        </p>
      )}
    </div>
  );
}
