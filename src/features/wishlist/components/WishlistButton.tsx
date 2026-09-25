"use client";

import { Heart } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import {
  useRefreshStorefront,
  useStorefrontSession,
} from "@/features/session/components/StorefrontSessionProvider";
import { toggleWishlist } from "../actions";

type Props = {
  productId: string;
};

export function WishlistButton({ productId }: Props) {
  const refresh = useRefreshStorefront();
  const { wishlistItems } = useStorefrontSession();
  // Optimistic value until the refreshed wishlist arrives
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const inWishlist = optimistic ?? wishlistItems.some((item) => item.productId === productId);

  const { execute, isExecuting } = useAction(toggleWishlist, {
    onSuccess: async ({ data }) => {
      if (data) {
        if (data.added) toast.success("Dodano do ulubionych");
        else toast("Usunięto z ulubionych");
      }
      await refresh();
      setOptimistic(null);
    },
    onError: () => {
      setOptimistic(null);
      toast.error("Błąd", { description: "Nie udało się zaktualizować ulubionych" });
    },
  });

  return (
    <button
      type="button"
      disabled={isExecuting}
      onClick={() => {
        setOptimistic(!inWishlist);
        execute({ productId });
      }}
      aria-label={inWishlist ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
      className={`flex size-10 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
        inWishlist
          ? "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "border-border bg-background text-muted-foreground hover:border-destructive hover:text-destructive"
      }`}
    >
      <Heart className={`size-5 ${inWishlist ? "fill-current" : ""}`} />
    </button>
  );
}
