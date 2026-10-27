import { ArrowRight, Gift } from "lucide-react";
import Link from "next/link";
import { GiftSetCard, type GiftSetListItem } from "@/features/gift-sets/components/GiftSetCard";
import { SectionHeading } from "./SectionHeading";

type Props = {
  giftSets: GiftSetListItem[];
  builderActive: boolean;
};

const BUILDER_HREF = "/zestawy-prezentowe/stworz";

/** Curated gift sets plus the "build your own" entry point. */
export function HomeGiftSets({ giftSets, builderActive }: Props) {
  if (giftSets.length === 0 && !builderActive) return null;
  // Builder only: one compact band instead of a heading over a lonely banner
  if (giftSets.length === 0) return <BuilderBand />;

  return (
    <section aria-labelledby="gift-sets-h" className="space-y-4">
      <SectionHeading
        id="gift-sets-h"
        title="Zestawy prezentowe"
        link={{ href: "/zestawy-prezentowe", label: "Zobacz wszystkie" }}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {builderActive && <BuilderTile />}
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
          className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary-foreground px-5 text-sm font-semibold text-primary transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Złóż własny zestaw
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
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

/** Product-sized tile beside the curated sets (full-width row on phones). */
function BuilderTile() {
  return (
    <Link
      href={BUILDER_HREF}
      className="group col-span-2 flex flex-col items-start gap-5 rounded-2xl bg-primary p-5 text-primary-foreground shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6 md:col-span-1 md:justify-between md:gap-6"
    >
      <div className="flex items-center gap-4 md:flex-col md:items-start">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
          <Gift className="size-6" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-extrabold leading-snug tracking-tight">Złóż własny zestaw</h3>
          <p className="mt-1 text-sm text-primary-foreground/85">
            Wybierz produkty i stwórz prezent dopasowany do bliskiej osoby
          </p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary-foreground px-4 py-2.5 text-sm font-semibold text-primary">
        Stwórz zestaw
        <ArrowRight
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          aria-hidden
        />
      </span>
    </Link>
  );
}
