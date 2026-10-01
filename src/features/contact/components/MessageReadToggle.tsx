"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setMessageRead } from "../actions";

/** Marks an opened message as read once, and lets the admin flip it back to unread */
export function MessageReadToggle({ id, isRead }: { id: string; isRead: boolean }) {
  const router = useRouter();
  const { execute, isPending } = useAction(setMessageRead, {
    // Leaving it open would auto-mark it read again — go back to the inbox
    onSuccess: ({ input }) => {
      if (!input.isRead) router.push("/admin/wiadomosci");
    },
    onError: ({ error }) => toast.error(error?.serverError ?? "Błąd zapisu"),
  });
  const autoMarked = useRef(false);

  useEffect(() => {
    if (!isRead && !autoMarked.current) {
      autoMarked.current = true;
      execute({ id, isRead: true });
    }
  }, [id, isRead, execute]);

  return (
    <Button
      variant="outline"
      size="lg"
      disabled={isPending}
      onClick={() => execute({ id, isRead: false })}
    >
      <Mail aria-hidden />
      Oznacz jako nieprzeczytane
    </Button>
  );
}
