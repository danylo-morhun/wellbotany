import { ArrowRight, MessageCircle, RotateCcw, Truck } from "lucide-react";
import Link from "next/link";
import { cheapestPaidRate } from "@/features/checkout/lib/shipping";
import { getShippingRates } from "@/features/checkout/lib/shipping-rates";
import { getShopSettings } from "@/features/settings/lib/shop-settings";
import { formatPrice, formatPriceCompact } from "@/lib/format";
import { SectionHeading } from "./SectionHeading";

/** Buying details: shipping prices, returns, help. */
export async function WhyUs() {
  const [{ freeShippingThresholdPln }, rates] = await Promise.all([
    getShopSettings(),
    getShippingRates(),
  ]);
  const pointFrom = cheapestPaidRate(rates, "point");
  const doorFrom = cheapestPaidRate(rates, "door");
  const prices = [
    pointFrom !== null && `Paczkomaty i punkty od ${formatPrice(pointFrom)}`,
    doorFrom !== null && `kurier od ${formatPrice(doorFrom)}`,
  ].filter(Boolean);
  const freeShipping =
    freeShippingThresholdPln !== null
      ? ` Od ${formatPriceCompact(freeShippingThresholdPln)} — gratis.`
      : "";

  const items = [
    {
      icon: Truck,
      title: "Dostawa w 24–48 h",
      text: `${prices.join(", ")}.${freeShipping}`,
      link: { href: "/dostawa", label: "Dostawa i płatność" },
    },
    {
      icon: RotateCcw,
      title: "14 dni na zwrot",
      text: "Możesz odstąpić od umowy w ciągu 14 dni od otrzymania paczki.",
      link: { href: "/zwroty", label: "Zwroty i reklamacje" },
    },
    {
      icon: MessageCircle,
      title: "Pomożemy wybrać",
      text: "Tel. +48 797 771 703 lub kontakt@wellbotany.pl, pon–pt 9–18, sob 9–14.",
      link: { href: "/kontakt", label: "Napisz do nas" },
    },
  ];

  return (
    <section aria-labelledby="why-h" className="space-y-5">
      <SectionHeading id="why-h" title="Zakupy bez ryzyka" />
      <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
        {items.map(({ icon: Icon, ...item }) => (
          <li
            key={item.title}
            className="flex flex-col gap-1.5 rounded-2xl bg-card p-5 shadow-card"
          >
            <span className="mb-1.5 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="font-bold text-foreground">{item.title}</span>
            <span className="text-sm text-muted-foreground">{item.text}</span>
            <Link
              href={item.link.href}
              className="group mt-auto inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary hover:underline"
            >
              {item.link.label}
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
