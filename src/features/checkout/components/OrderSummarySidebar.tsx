import { groupCartItems } from "@/features/cart/lib/grouping";
import { effectiveUnitPricePln } from "@/features/cart/lib/pricing";
import type { CartItem } from "@/features/cart/lib/session";
import { formatPrice } from "@/lib/format";

type Props = {
  items: CartItem[];
  subtotal: number;
};

export function OrderSummarySidebar({ items, subtotal }: Props) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold">
          Twoje zamówienie ({itemCount} {itemCount === 1 ? "produkt" : "produktów"})
        </h2>
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {groupCartItems(items).map((row) =>
            row.kind === "single" ? (
              <li key={row.item.id} className="flex justify-between gap-2 py-2 text-sm">
                <span className="text-muted-foreground">
                  {row.item.variant.product.namePl}
                  {row.item.variant.optionValue ? ` (${row.item.variant.optionValue})` : ""} ×{" "}
                  {row.item.quantity}
                </span>
                <span className="shrink-0">
                  {formatPrice(effectiveUnitPricePln(row.item) * row.item.quantity)}
                </span>
              </li>
            ) : (
              <li key={row.groupId} className="py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="shrink-0">{formatPrice(row.totalPln)}</span>
                </div>
              </li>
            ),
          )}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-semibold">
          <span>Produkty razem</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">+ koszt dostawy w kolejnym kroku</p>
      </div>
    </aside>
  );
}
