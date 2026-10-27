import { formatPrice } from "@/lib/format";

/** `productsPln` is the subtotal after discounts — the amount the free-delivery threshold is checked against. */
type Props = { productsPln: number; threshold: number };

/** Distance to free delivery; renders nothing once it's reached (the delivery row then says 0,00 zł). */
export function ShippingProgress({ productsPln, threshold }: Props) {
  if (productsPln >= threshold) return null;
  const remaining = threshold - productsPln;
  const pct = Math.max(Math.min((productsPln / threshold) * 100, 100), 0);

  return (
    <div>
      <p className="text-xs text-muted-foreground">
        Dodaj produkty za{" "}
        <span className="font-semibold text-foreground">{formatPrice(remaining)}</span>, a dostawa
        będzie darmowa.
      </p>
      <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
