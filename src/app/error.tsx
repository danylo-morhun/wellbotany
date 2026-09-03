"use client";

import * as Sentry from "@sentry/nextjs";
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-7xl font-extrabold tracking-tight text-destructive/20">500</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Coś poszło nie tak</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Wystąpił nieoczekiwany błąd. Spróbuj ponownie — jeśli problem się powtarza, skontaktuj się z
        nami.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        >
          <RotateCcw className="size-4" />
          Spróbuj ponownie
        </button>
        <Link
          href="/"
          className="rounded-full bg-secondary px-7 py-3 text-sm font-semibold text-secondary-foreground transition-colors duration-200 hover:bg-primary hover:text-primary-foreground motion-reduce:transition-none"
        >
          Strona główna
        </Link>
      </div>
    </main>
  );
}
