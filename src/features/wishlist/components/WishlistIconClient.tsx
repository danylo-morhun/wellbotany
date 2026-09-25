"use client";

import { Heart, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useStorefrontSession } from "@/features/session/components/StorefrontSessionProvider";
import { WishlistItemCard } from "./WishlistItemCard";

export function WishlistIconClient() {
  const { wishlistItems: items } = useStorefrontSession();
  const itemCount = items.length;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ulubione${itemCount > 0 ? ` (${itemCount})` : ""}`}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Heart className="size-5" />
        {itemCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">
              Ulubione {itemCount > 0 && `(${itemCount})`}
            </SheetTitle>
            <SheetClose
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Zamknij ulubione"
            >
              <X className="size-5" />
            </SheetClose>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                <Heart className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Brak ulubionych produktów</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Przeglądaj katalog
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <WishlistItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <SheetFooter>
              <Link
                href="/ulubione"
                onClick={() => setOpen(false)}
                className="block w-full rounded-lg border border-border px-4 py-3 text-center text-sm font-medium text-foreground hover:bg-muted"
              >
                Zobacz wszystkie ulubione
              </Link>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
