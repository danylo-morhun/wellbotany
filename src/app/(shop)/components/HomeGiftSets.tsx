import { ArrowRight, Gift } from "lucide-react";
import Link from "next/link";
import { GiftSetCard, type GiftSetListItem } from "@/features/gift-sets/components/GiftSetCard";
import { formatPriceCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { posterFont } from "./poster-font";

type Props = {
  giftSets: GiftSetListItem[];
  builderActive: boolean;
};

const BUILDER_HREF = "/zestawy-prezentowe/stworz";

// Christmas delivery promise (regulamin: 2 working days + carrier); shown until the day
const ORDER_FOR_CHRISTMAS_BY = "2026-12-16";
const ORDER_BY_LABEL = "środy 16.12";

/** Curated gift sets in a forest panel (the posts' "Prezent gotowy"), plus the builder. */
export function HomeGiftSets({ giftSets, builderActive }: Props) {
  if (giftSets.length === 0 && !builderActive) return null;
  // Builder only: one compact band instead of a heading over a lonely banner
  if (giftSets.length === 0) return <BuilderBand />;

  const prices = giftSets.map((gs) => gs.pricePln);
  const from = Math.min(...prices);
  const to = Math.max(...prices);
  const beforeChristmas = new Date().toISOString().slice(0, 10) <= ORDER_FOR_CHRISTMAS_BY;

  return (
    <section
      aria-labelledby="gift-sets-h"
      className="grid gap-7 overflow-hidden rounded-[2rem] bg-matcha-forest p-5 text-matcha-forest-foreground sm:p-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-10 lg:p-10"
    >
      <div className="flex flex-col items-start gap-4">
        <h2
          id="gift-sets-h"
          className={cn(
            posterFont.className,
            "text-[clamp(3rem,6vw,4.5rem)] uppercase leading-[0.9] tracking-[0.005em]",
          )}
        >
          Prezent
          <br />
          gotowy
        </h2>
        <p className="max-w-sm text-matcha-forest-foreground/85">
          {giftSets.length === 1
            ? `Zestaw prezentowy za ${formatPriceCompact(from)}.`
            : `${giftSets.length} ${giftSets.length < 5 ? "zestawy" : "zestawów"} od ${formatPriceCompact(from)} do ${formatPriceCompact(to)}.`}{" "}
          {builderActive && "Albo złóż własny — wybierz produkty i dodaj pudełko."}
        </p>
        {beforeChristmas && (
          <p className="rounded-full bg-matcha-lime px-4 py-1.5 text-sm font-bold text-matcha-forest">
            Zamów i opłać do {ORDER_BY_LABEL} — dostawa przed Świętami
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
          {builderActive && (
            <Link
              href={BUILDER_HREF}
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-matcha-paper px-6 font-bold text-matcha-forest transition-transform spring-snappy active:scale-[0.97] motion-reduce:transition-none"
            >
              <Gift className="size-4" aria-hidden />
              Złóż własny zestaw
            </Link>
          )}
          <Link
            href="/zestawy-prezentowe"
            className="group inline-flex min-h-11 items-center gap-1 text-sm font-bold underline-offset-4 hover:underline"
          >
            Wszystkie zestawy
            <ArrowRight
              className="size-4 transition-transform spring-snappy group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {giftSets.map((gs) => (
          <GiftSetCard key={gs.slug} giftSet={gs} headingLevel={3} />
        ))}
      </div>
    </section>
  );
}

function BuilderBand() {
  return (
    <section
      aria-labelledby="gift-sets-h"
      className="flex flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground sm:flex-row sm:items-center sm:gap-5 sm:px-6"
    >
      <div className="flex items-center gap-4 sm:flex-1">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
          <Gift className="size-6" aria-hidden />
        </span>
        <div>
          <h2 id="gift-sets-h" className="text-lg font-extrabold leading-snug tracking-tight">
            Zestawy prezentowe
          </h2>
          <p className="mt-0.5 text-sm text-primary-foreground/85">
            Wybierz produkty i stwórz prezent dopasowany do bliskiej osoby
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={BUILDER_HREF}
          className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary-foreground px-5 text-sm font-semibold text-primary transition-transform spring-snappy active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Złóż własny zestaw
          <ArrowRight
            className="size-4 transition-transform spring-snappy group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            aria-hidden
          />
        </Link>
        <Link
          href="/zestawy-prezentowe"
          className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
        >
          Zobacz zestawy
        </Link>
      </div>
    </section>
  );
}
