import { ClipboardList, PackageCheck, Store, Truck } from "lucide-react";
import { getShopSettings } from "@/features/settings/lib/shop-settings";
import { formatPriceCompact } from "@/lib/format";

const staticItems = [
  { icon: PackageCheck, title: "Wysyłka w 24–48 h", sub: "paczkomat, Orlen, kurier" },
  { icon: Store, title: "Odbiór osobisty", sub: "w Kaliszu — 0 zł" },
  { icon: ClipboardList, title: "Pełny skład i dawka", sub: "przy każdym produkcie" },
];

export async function TrustStrip() {
  const { freeShippingThresholdPln } = await getShopSettings();
  const items = [
    freeShippingThresholdPln !== null
      ? {
          icon: Truck,
          title: "Darmowa dostawa",
          sub: `od ${formatPriceCompact(freeShippingThresholdPln)}`,
        }
      : { icon: Truck, title: "Szybka wysyłka", sub: "wysyłamy w 24–48 h" },
    ...staticItems,
  ];

  return (
    <section aria-label="Zakupy w Well Botany">
      {/* 2×2 until four columns have room for one-line titles; no sideways
          scroll, so no item is cut off on phones */}
      <ul className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, sub }) => (
          <li
            key={title}
            className="flex items-center gap-3 rounded-2xl bg-card px-3.5 py-3 shadow-card sm:px-4"
          >
            <span className="hidden size-9 shrink-0 sm:flex items-center justify-center rounded-full bg-secondary text-primary">
              <Icon className="size-4.5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold leading-snug text-foreground sm:text-sm">
                {title}
              </span>{" "}
              <span className="block text-xs text-muted-foreground">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
