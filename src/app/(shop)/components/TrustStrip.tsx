import { PackageCheck, Store } from "lucide-react";

// Free shipping lives in the always-visible top bar; this line keeps only
// what a first-time buyer can't see anywhere else near the products
const items = [
  {
    icon: PackageCheck,
    title: "Wysyłka w 24–48 h",
    sub: "paczkomat, Orlen, kurier",
    short: "Wysyłka 24–48 h",
  },
  {
    icon: Store,
    title: "Odbiór osobisty",
    sub: "w Kaliszu — 0 zł",
    short: "Odbiór w Kaliszu 0 zł",
  },
];

/** One thin line under the hero — no cards, so it doesn't compete with product cards. */
export function TrustStrip() {
  return (
    <section aria-label="Zakupy w Well Botany">
      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[13px] sm:gap-x-10 sm:text-sm">
        {items.map(({ icon: Icon, title, sub, short }) => (
          <li key={title} className="flex items-center gap-2">
            <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
            {/* Phones get one self-contained phrase per item */}
            <span className="font-semibold text-foreground sm:hidden">{short}</span>
            <span className="hidden sm:inline">
              <span className="font-semibold text-foreground">{title}</span>{" "}
              <span className="text-muted-foreground">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
