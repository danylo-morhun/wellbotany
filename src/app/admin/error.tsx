"use client";

import * as Sentry from "@sentry/nextjs";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { EmptyState } from "@/app/admin/components/ui";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="rounded-2xl bg-card shadow-card" role="alert">
      <EmptyState icon={TriangleAlert} title="Nie udało się wczytać tej strony">
        <p>
          Spróbuj ponownie. Jeśli błąd się powtarza, wróć do pulpitu i otwórz stronę jeszcze raz.
        </p>
        {error.digest && <p className="mt-1 font-mono text-xs">Kod błędu: {error.digest}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button size="lg" onClick={() => retry()}>
            <RotateCcw aria-hidden />
            Spróbuj ponownie
          </Button>
          <Link href="/admin" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Wróć do pulpitu
          </Link>
        </div>
      </EmptyState>
    </div>
  );
}
