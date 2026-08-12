"use client";

import { ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatPrice } from "@/lib/format";
import { groupCartItems } from "../lib/grouping";
import { effectiveUnitPricePln } from "../lib/pricing";
import type { CartWithItems } from "../lib/session";
import { CartItemRow } from "./CartItemRow";
import { GiftSetCartRow } from "./GiftSetCartRow";

type Props = {
  itemCount: number;
  items: CartWithItems["items"];
};

export function CartIconClient({ itemCount, items }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => {
      toast.dismiss();
      setOpen(true);
    };
    window.addEventListener("cart:open", handleOpen);
    return () => window.removeEventListener("cart:open", handleOpen);
  }, []);

  const subtotal = items.reduce(
    (sum, item) => sum + effectiveUnitPricePln(item) * item.quantity,
    0,
  );
  const rows = groupCartItems(items);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Koszyk${itemCount > 0 ? ` (${itemCount})` : ""}`}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ShoppingCart className="size-5" />
        {itemCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">
              Koszyk {itemCount > 0 && `(${itemCount})`}
            </SheetTitle>
            <SheetClose
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Zamknij koszyk"
            >
              <X className="size-5" />
            </SheetClose>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                <ShoppingCart className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Twój koszyk jest pusty</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Przeglądaj katalog
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {rows.map((row) =>
                  row.kind === "single" ? (
                    <CartItemRow key={row.item.id} item={row.item} />
                  ) : (
                    <GiftSetCartRow
                      key={row.groupId}
                      groupId={row.groupId}
                      label={row.label}
                      items={row.items}
                      totalPln={row.totalPln}
                      packagingLabel={row.packagingLabel}
                      giftMessage={row.giftMessage}
                    />
                  ),
                )}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <SheetFooter>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Razem</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <Link
                  href="/koszyk"
                  onClick={() => setOpen(false)}
                  className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
                >
                  Przejdź do koszyka
                </Link>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
