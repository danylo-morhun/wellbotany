"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { moderateReview } from "../actions";

type Props = { id: string; status: "PENDING" | "APPROVED" | "REJECTED" };

export function ModerationButtons({ id, status }: Props) {
  const { execute, isPending } = useAction(moderateReview, {
    onError: ({ error }) => toast.error(error.serverError ?? "Błąd"),
  });
  return (
    <div className="flex gap-2">
      {status !== "APPROVED" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => execute({ id, status: "APPROVED" })}
          className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          Opublikuj
        </button>
      )}
      {status !== "REJECTED" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => execute({ id, status: "REJECTED" })}
          className="rounded-lg border border-destructive px-3 py-1 text-xs text-destructive disabled:opacity-50"
        >
          Odrzuć
        </button>
      )}
    </div>
  );
}
