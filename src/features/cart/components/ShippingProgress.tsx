import { Package } from "lucide-react";
import { formatPrice } from "@/lib/format";

type Props = { subtotal: number; threshold: number };

export function ShippingProgress({ subtotal, threshold }: Props) {
  const remaining = threshold - subtotal;
  const pct = Math.min((subtotal / threshold) * 100, 100);

  if (subtotal >= threshold) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
        <Package className="size-4 shrink-0 text-success" />
        <p className="text-sm font-medium text-success">Masz darmową dostawę!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Package className="size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Dodaj produkty za{" "}
          <span className="font-semibold text-foreground">{formatPrice(remaining)}</span> do
          darmowej dostawy
        </p>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
