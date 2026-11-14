"use client";

import { useAction } from "next-safe-action/hooks";
import { Button } from "@/components/ui/button";
import { retryOnlinePayment } from "../actions";

export function RetryPaymentButton({ orderNumber }: { orderNumber: string }) {
  const { execute, isPending, result } = useAction(retryOnlinePayment, {
    onSuccess: ({ data }) => {
      if (data?.redirectUrl) window.location.assign(data.redirectUrl);
    },
  });
  return (
    <div className="mt-3 space-y-2">
      <Button onClick={() => execute({ orderNumber })} disabled={isPending}>
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
