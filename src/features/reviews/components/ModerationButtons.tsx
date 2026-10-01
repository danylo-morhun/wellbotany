"use client";

import { Check, X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { moderateReview } from "../actions";

type Props = { id: string; status: "PENDING" | "APPROVED" | "REJECTED" };

export function ModerationButtons({ id, status }: Props) {
  const { execute, isPending } = useAction(moderateReview, {
    onSuccess: ({ input }) =>
      toast.success(input.status === "APPROVED" ? "Opinia opublikowana" : "Opinia odrzucona"),
    onError: ({ error }) => toast.error(error.serverError ?? "Błąd"),
  });
  return (
    <div className="flex gap-2">
      {status !== "APPROVED" && (
        <Button disabled={isPending} onClick={() => execute({ id, status: "APPROVED" })}>
          <Check aria-hidden />
          Opublikuj
        </Button>
      )}
      {status !== "REJECTED" && (
        <Button
          variant="ghost"
          disabled={isPending}
          onClick={() => execute({ id, status: "REJECTED" })}
          className="text-muted-foreground hover:text-destructive"
        >
          <X aria-hidden />
          Odrzuć
        </Button>
      )}
    </div>
  );
}
