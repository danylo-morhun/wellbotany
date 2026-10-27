import { Banknote, Clock, type LucideIcon, MapPin, RotateCcw, Truck } from "lucide-react";
import Link from "next/link";
import { CARRIERS, type ShippingRate } from "@/features/checkout/lib/shipping";
import { getShippingRates } from "@/features/checkout/lib/shipping-rates";
import { isP24Enabled } from "@/features/przelewy24/lib/config";
import { getShopSettings } from "@/features/settings/lib/shop-settings";
import { formatPriceCompact } from "@/lib/format";

type Item = { icon: LucideIcon; title: string; text?: string; href: string };

const listPl = (items: string[]) =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} i ${items.at(-1)}`;

/** Named pickup networks first (only enabled ones), then the generic options. */
export function deliveryItem(rates: ShippingRate[]): Item | null {
  const enabled = new Set(rates.map((r) => r.method));
  if (enabled.size === 0) return null;
  const networks = [
    enabled.has("INPOST_PACZKOMAT") && "Paczkomaty InPost",
    enabled.has("ORLEN_PACZKA") && "Orlen Paczka",
  ].filter((x): x is string => Boolean(x));
  const otherPoints = rates.some(
    (r) =>
      CARRIERS[r.method].delivery === "point" &&
      r.method !== "INPOST_PACZKOMAT" &&
      r.method !== "ORLEN_PACZKA",
  );
  const others = [
    otherPoints && (networks.length > 0 ? "inne punkty" : "punkty odbioru"),
    rates.some((r) => CARRIERS[r.method].delivery === "door") && "kurier",
    enabled.has("PICKUP") && "odbiór w Kaliszu",
  ].filter((x): x is string => Boolean(x));
  const [first, ...rest] = networks.length > 0 ? [listPl(networks), ...others] : others;
  return {
    icon: MapPin,
    title: first.charAt(0).toUpperCase() + first.slice(1),
    text: rest.length > 0 ? `Także ${listPl(rest)}` : undefined,
    href: "/dostawa",
  };
}

/** Payment line from the same switch the checkout uses: BLIK only while Przelewy24 is on. */
export function paymentItem(onlineEnabled: boolean, pickupEnabled: boolean): Item {
  return onlineEnabled
    ? {
        icon: Banknote,
        title: "BLIK i szybkie przelewy",
        text: "Przez Przelewy24",
        href: "/dostawa",
      }
    : {
        icon: Banknote,
        title: "Przelew tradycyjny",
        // Cash on delivery is offered for in-store pickup only (StepPayment)
        text: pickupEnabled ? "lub płatność przy odbiorze osobistym" : undefined,
        href: "/dostawa",
      };
}

/** Compact buying facts right under the hero. Every line comes from live settings. */
export async function TrustStrip() {
  const [{ freeShippingThresholdPln, productMetaSuffixPl }, rates] = await Promise.all([
    getShopSettings(),
    getShippingRates(),
  ]);
  const dispatch = productMetaSuffixPl?.replace(/\.$/, "").trim();
  const delivery = deliveryItem(rates);

  const items = [
    freeShippingThresholdPln !== null && {
      icon: Truck,
      title: `Darmowa dostawa od ${formatPriceCompact(freeShippingThresholdPln)}`,
      href: "/dostawa",
    },
    dispatch && { icon: Clock, title: dispatch, href: "/dostawa" },
    delivery,
    { icon: RotateCcw, title: "14 dni na zwrot", text: "Bez podania przyczyny", href: "/zwroty" },
    paymentItem(
      isP24Enabled(),
      rates.some((r) => r.method === "PICKUP"),
    ),
  ].filter((x): x is Item => Boolean(x));

  return (
    <section aria-label="Dostawa, zwroty i płatność">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3 md:flex md:justify-between md:gap-6">
        {items.map(({ icon: Icon, title, text, href }) => (
          <li key={title} className="min-w-0">
            <Link href={href} className="group flex items-start gap-2.5 py-1">
              <Icon
                className="mt-0.5 size-5 shrink-0 text-primary"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                  {title}
                </span>
                {/* Phones keep the headline facts only */}
                {text && (
                  <span className="text-xs text-muted-foreground max-md:hidden">{text}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
