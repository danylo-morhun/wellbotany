"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPriceCompact } from "@/lib/format";
import { describeTiers, isTierPromoLive, type TierPromo } from "../lib/tiered";

const END_DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Warsaw",
});

/**
 * Terms of the cart promotion, stated up front (UPNPR art. 6). The header can
 * be statically rendered, so the dates are checked again in the browser — the
 * bar disappears at the end instead of promising an expired discount.
 */
export function PromoBar({ promo, initiallyLive }: { promo: TierPromo; initiallyLive: boolean }) {
  const [live, setLive] = useState(initiallyLive);

  useEffect(() => {
    setLive(isTierPromoLive(promo));
  }, [promo]);

  if (!live) return null;
  return (
    <p className="bg-accent px-4 py-1.5 text-center text-xs font-medium text-accent-foreground">
      <strong>{promo.name}:</strong> {describeTiers(promo.tiers, formatPriceCompact)} na koszyk
      {promo.endsAt && ` · do ${END_DATE.format(new Date(promo.endsAt))}`} · nie dotyczy produktów w
      promocji, nie łączy się z kodami.{" "}
      <Link href="/regulamin#rabat-od-koszyka" className="underline">
        Zasady
      </Link>
    </p>
  );
}
