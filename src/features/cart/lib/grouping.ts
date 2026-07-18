import { effectiveUnitPricePln } from "./pricing";
import type { CartItem } from "./session";

export type CartRow =
  | { kind: "single"; item: CartItem }
  | { kind: "giftSet"; groupId: string; label: string; items: CartItem[]; totalPln: number };

/** Groups plain cart lines individually, and gift-set component lines (giftSetGroupId != "") into a single row. */
export function groupCartItems(items: CartItem[]): CartRow[] {
  const rows: CartRow[] = [];
  const groups = new Map<string, CartItem[]>();

  for (const item of items) {
    if (!item.giftSetGroupId) {
      rows.push({ kind: "single", item });
      continue;
    }
    const group = groups.get(item.giftSetGroupId);
    if (group) group.push(item);
    else groups.set(item.giftSetGroupId, [item]);
  }

  for (const [groupId, groupItems] of groups) {
    rows.push({
      kind: "giftSet",
      groupId,
      label: groupItems[0].giftSetLabel ?? "Zestaw prezentowy",
      items: groupItems,
      totalPln: groupItems.reduce((s, i) => s + effectiveUnitPricePln(i) * i.quantity, 0),
    });
  }

  return rows;
}
