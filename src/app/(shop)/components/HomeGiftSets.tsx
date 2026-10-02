import { ArrowRight, Gift } from "lucide-react";
import Link from "next/link";
import { GiftSetCard, type GiftSetListItem } from "@/features/gift-sets/components/GiftSetCard";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";

type Props = {
  giftSets: GiftSetListItem[];
  builderActive: boolean;
};

const BUILDER_HREF = "/zestawy-prezentowe/stworz";

/** Curated gift sets plus the "build your own" entry point. */
export function HomeGiftSets({ giftSets, builderActive }: Props) {
  if (giftSets.length === 0 && !builderActive) return null;

  return (
    <section aria-labelledby="gift-sets-h" className="space-y-4">
      <SectionHeading
        id="gift-sets-h"
        title="Zestawy prezentowe"
        link={{ href: "/zestawy-prezentowe", label: "Zobacz wszystkie" }}
      />

      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          giftSets.length > 0 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1",
        )}
      >
        {builderActive && <BuilderTile wide={giftSets.length === 0} />}
        {giftSets.map((gs) => (
          <GiftSetCard key={gs.slug} giftSet={gs} headingLevel={3} />
        ))}
      </div>
    </section>
  );
}

function BuilderTile({ wide }: { wide: boolean }) {
  return (
    <Link
      href={BUILDER_HREF}
      className={cn(
        "group flex rounded-2xl bg-primary p-5 text-primary-foreground shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6",
        // Full-width row on phones; a product-sized tile beside the sets from md up
        wide
          ? "flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between"
          : "col-span-2 flex-col items-start gap-5 md:col-span-1 md:justify-between md:gap-6",
      )}
    >
      <div className={cn("flex items-center gap-4", !wide && "md:flex-col md:items-start")}>
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
