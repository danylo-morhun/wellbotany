"use client";

import { useAction } from "next-safe-action/hooks";
import { unsubscribeFromNewsletter } from "../actions";

export function UnsubscribeButton({ email, token }: { email: string; token: string }) {
  const { execute, result, isPending } = useAction(unsubscribeFromNewsletter);

  if (result.data?.success)
    return (
      <p className="font-medium text-primary" role="status">
        ✓ Wypisaliśmy {email} z newslettera.
      </p>
    );

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => execute({ email, token })}
        disabled={isPending}
        className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60"
      >
        {isPending ? "Wypisywanie…" : "Wypisz mnie z newslettera"}
      </button>
      {result.serverError && <p className="text-sm text-destructive">{result.serverError}</p>}
    </div>
  );
}
