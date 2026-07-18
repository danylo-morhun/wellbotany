"use client";

import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { addToCart } from "../actions";
import { groupCartItems } from "../lib/grouping";
import type { CartItem } from "../lib/session";
import { CartItemRow } from "./CartItemRow";
import { GiftSetCartRow } from "./GiftSetCartRow";

type Props = { items: CartItem[] };

export function CartList({ items: initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  const { execute: restoreItem } = useAction(addToCart, {
    onSuccess: () => router.refresh(),
  });

  const handleRemove = (item: CartItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    toast("Produkt usunięty", {
      action: {
        label: "Cofnij",
        onClick: () => {
          setItems((prev) => [...prev, item]);
          restoreItem({ variantId: item.variantId, quantity: item.quantity });
        },
      },
      duration: 5000,
    });
  };

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Koszyk jest pusty</p>;
  }

  const rows = groupCartItems(items);

  return (
    <div className="divide-y divide-border/60">
      {rows.map((row) =>
        row.kind === "single" ? (
          <CartItemRow key={row.item.id} item={row.item} onRemove={() => handleRemove(row.item)} />
        ) : (
          <GiftSetCartRow
            key={row.groupId}
            groupId={row.groupId}
            label={row.label}
            items={row.items}
            totalPln={row.totalPln}
          />
        ),
      )}
    </div>
  );
}
