import { formatPrice, formatPriceCompact } from "@/lib/format";
import type { DeliveryEstimate } from "../lib/shipping";

/** Right-hand value of a "Dostawa" summary row before a method is chosen. */
export function DeliveryEstimateValue({
  estimate,
  freeShippingThresholdPln,
}: {
  estimate: DeliveryEstimate;
  freeShippingThresholdPln: number | null;
}) {
  if (estimate.free) {
    return (
      <span className="text-right">
        <span className="font-medium text-success">{formatPrice(0)}</span>
        {freeShippingThresholdPln !== null && (
          <span className="block text-xs text-muted-foreground">
            darmowa od {formatPriceCompact(freeShippingThresholdPln)}
          </span>
        )}
      </span>
    );
  }
  if (estimate.fromPln === null) {
    return <span className="text-right text-muted-foreground">wybierzesz przy zamówieniu</span>;
  }
  return <span className="text-right font-medium">od {formatPrice(estimate.fromPln)}</span>;
}
