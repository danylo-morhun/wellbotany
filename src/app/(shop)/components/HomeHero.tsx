import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CampaignWindow } from "@/features/home/components/CampaignWindow";
import type { Campaign } from "@/features/home/lib/campaign";
import { cn } from "@/lib/utils";
import { posterFont } from "./poster-font";

// Seasonal copy: change the poster words and lead with the season (posts use the same)
const HERO: { poster: [string, string]; lead: string } = {
  poster: ["Zima", "w szafce"],
  lead: "Witaminy na sezon, czekolada na wieczór i gotowe zestawy na prezent.",
};

// Cut-out packshots, staged like the social posts: a tilted group on the forest band
const PRODUCTS = [
  {
    src: "/images/home/healthlabs-chillme.webp",
    alt: "HealthLabs ChillMe",
    width: 492,
    height: 640,
    className: "left-0 bottom-[8%] h-[54%] -rotate-6",
  },
  {
    src: "/images/home/benjamissimo-matcha.webp",
    alt: "Benjamissimo czekolada Matcha Lemon",
    width: 320,
    height: 640,
    className: "left-[25%] bottom-[12%] h-[76%] rotate-3 z-10",
  },
  {
    src: "/images/home/bestlab-d3-krople.webp",
    alt: "BestLab witamina D3 w kroplach",
    width: 427,
    height: 609,
    className: "right-0 bottom-[8%] h-[58%] rotate-[5deg]",
  },
  {
    src: "/images/home/cocoa-pistacje.webp",
    alt: "Cocoa czekolada z pistacjami",
    width: 346,
    height: 600,
    className: "left-[52%] bottom-[3%] h-[42%] -rotate-[8deg] z-20",
  },
];

type Props = {
  productCount: number;
  hasDeals: boolean;
  campaign?: Campaign | null;
  /** One line about the cart discount, shown under the campaign lead */
  cartDiscount?: CartTier[] | null;
};
type CartTier = { percent: number; from: string };

type HeroLink = { href: string; label: string };

/** Cart-discount tiers as dashed coupons; the restriction stays next to them */
function CartCoupons({ tiers, className }: { tiers: CartTier[]; className?: string }) {
  return (
    <div className={className}>
      <p className="font-semibold text-matcha-lime text-sm md:text-base">
        Rabat od koszyka, bez kodu
      </p>
      <ul className="mt-2 flex flex-wrap gap-2.5">
        {tiers.map((t) => (
          <li
            key={t.percent}
            className="flex items-baseline gap-2 rounded-xl border-2 border-matcha-lime border-dashed bg-matcha-forest px-3.5 py-1.5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] odd:rotate-1 even:-rotate-1"
          >
            <span className={cn(posterFont.className, "text-3xl text-matcha-lime leading-none")}>
              −{t.percent}%
            </span>
            <span className="font-semibold text-sm">od {t.from}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-matcha-forest-foreground/70 text-xs md:text-sm">
        na produkty bez obniżki
      </p>
    </div>
  );
}

/** Text half of the band: the page's H1, the poster words, the lead and two links */
function HeroCopy({
  poster,
  oneLine = false,
  stat,
  lead,
  note,
  stretch = false,
  primary,
  secondary,
}: {
  poster: readonly [string, string];
  oneLine?: boolean;
  stat?: readonly [string, string, string];
  lead: string;
  /** Cart-discount tiers, drawn as coupons */
  note?: CartTier[] | null;
  /** The primary link covers the whole band (campaign) */
  stretch?: boolean;
  primary: HeroLink;
  secondary: HeroLink;
}) {
  return (
    <div className="pb-2 md:pb-16">
      <h1 id="home-h1" className="text-sm font-semibold text-matcha-lime md:text-base">
        Suplementy diety, zioła i zdrowa żywność
      </h1>
      {oneLine ? (
        // Campaign: one line, as wide as the text column allows
        <p
          className={cn(
            posterFont.className,
            "mt-3 whitespace-nowrap text-[clamp(3.5rem,17vw,5.5rem)] uppercase leading-[0.9] tracking-[0.005em] md:text-[clamp(4rem,9.6vw,8.75rem)]",
          )}
        >
          {poster.join(" ")}
        </p>
      ) : (
        <p
          className={cn(
            posterFont.className,
            "mt-3 text-[clamp(3.75rem,10vw,8.25rem)] uppercase leading-[0.88] tracking-[0.005em]",
          )}
        >
          {poster[0]}
          <br />
          {poster[1]}
        </p>
      )}
      {stat && (
        <p className="mt-6 flex items-center gap-3 text-matcha-lime md:mt-8">
          <span className={cn(posterFont.className, "text-7xl leading-none md:text-8xl")}>
            {stat[0]}
          </span>
          <span className="font-bold text-xl leading-tight md:text-2xl">
            {stat[1]}
            <br />
            {stat[2]}
          </span>
        </p>
      )}
      <p
        className={cn(
          "max-w-md text-base text-matcha-forest-foreground/85 md:text-lg",
          stat ? "mt-3" : "mt-5",
        )}
      >
        {lead}
      </p>
      {note && note.length > 0 && <CartCoupons tiers={note} className="mt-5 md:hidden" />}
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href={primary.href}
          className={cn(
            "group inline-flex min-h-12 items-center gap-2 rounded-full bg-matcha-paper px-6 font-bold text-matcha-forest transition-transform duration-200 motion-reduce:transition-none",
            // Stretched: an overlay over the band makes it all one link; no press scale,
            // which would shrink the overlay to the button mid-click
            stretch
              ? "after:absolute after:inset-0 after:z-10 after:content-['']"
              : "active:scale-[0.97]",
          )}
        >
          {primary.label}
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </Link>
        <Link
          href={secondary.href}
          className="relative z-20 inline-flex min-h-12 items-center rounded-full border-2 border-matcha-lime px-6 font-bold text-matcha-forest-foreground transition-colors hover:bg-matcha-lime hover:text-matcha-forest"
        >
          {secondary.label}
        </Link>
      </div>
    </div>
  );
}

/** Opening band in the posts' Matcha look: the page's H1 as a small line, the season
 * as a poster word, two ways in, and a staged group of products. */
export function HomeHero({ productCount, hasDeals, campaign, cartDiscount }: Props) {
  // Rounded down, so "ponad" stays true between cache refreshes
  const shown = Math.floor(productCount / 100) * 100;
  const everyday = (
    <HeroCopy
      poster={HERO.poster}
      lead={shown >= 100 ? `${HERO.lead} Ponad ${shown} produktów z pełnym składem.` : HERO.lead}
      primary={{ href: "/zestawy-prezentowe", label: "Zestawy prezentowe" }}
      secondary={
        hasDeals
          ? { href: "#teraz-taniej", label: "Teraz taniej" }
          : { href: "/kategoria/zywnosc", label: "Zdrowa żywność" }
      }
    />
  );

  return (
    <section
      aria-labelledby="home-h1"
      className="relative overflow-hidden bg-matcha-forest text-matcha-forest-foreground"
    >
      <div className="container mx-auto grid items-end gap-2 px-4 pt-8 md:grid-cols-2 md:gap-8 md:pt-14">
        {campaign?.hero ? (
          <CampaignWindow
            startsAt={campaign.startsAt.toISOString()}
            endsAt={campaign.endsAt.toISOString()}
            fallback={everyday}
          >
            <HeroCopy
              poster={campaign.hero.poster}
              oneLine
              stat={campaign.hero.stat}
              lead={campaign.hero.lead}
              note={cartDiscount}
              stretch
              primary={{ href: "/katalog?promocje=1", label: "Zobacz obniżki" }}
              secondary={{ href: `#${campaign.id}-h`, label: campaign.title }}
            />
          </CampaignWindow>
        ) : (
          everyday
        )}
        <div className="pointer-events-none relative h-[260px] sm:h-[340px] md:h-[440px]">
          {campaign?.hero && cartDiscount && cartDiscount.length > 0 && (
            // Desktop: top-right corner above the products (phones: under the copy)
            <CampaignWindow
              startsAt={campaign.startsAt.toISOString()}
              endsAt={campaign.endsAt.toISOString()}
            >
              <CartCoupons
                tiers={cartDiscount}
                className="absolute top-0 right-0 z-30 hidden text-right md:block [&_ul]:justify-end"
              />
            </CampaignWindow>
          )}
          <div
            className="absolute inset-x-[8%] bottom-[-18%] h-[70%] rounded-[50%] bg-matcha-forest-foreground/[0.07]"
            aria-hidden
          />
          {PRODUCTS.map((p, i) => (
            <Image
              key={p.src}
              src={p.src}
              alt=""
              width={p.width}
              height={p.height}
              // LCP: the whole group sits in the first screen, so none is lazy; the two
              // biggest get preload + high fetch priority (`priority` no longer sets it)
              preload={i < 2}
              loading={i < 2 ? undefined : "eager"}
              fetchPriority={i < 2 ? "high" : undefined}
              sizes="(min-width: 768px) 25vw, 40vw"
              className={cn(
                "absolute w-auto drop-shadow-[0_28px_24px_rgba(0,0,0,0.32)]",
                p.className,
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
