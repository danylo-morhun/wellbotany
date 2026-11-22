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
  cartDiscount?: string | null;
};
const HEADING = (
  <h1 id="home-h1" className="text-sm font-semibold text-matcha-lime md:text-base">
    Suplementy diety, zioła i zdrowa żywność
  </h1>
);

type HeroLink = { href: string; label: string };

/** Text half of the band: the page's H1, the poster words, the lead and two links */
function HeroCopy({
  poster,
  heading = true,
  stat,
  lead,
  note,
  primary,
  secondary,
}: {
  /** null: the poster is drawn elsewhere (campaign: full width above) */
  poster: readonly [string, string] | null;
  /** Campaign: the H1 sits above the full-width poster instead */
  heading?: boolean;
  stat?: readonly [string, string, string];
  lead: string;
  note?: string | null;
  primary: HeroLink;
  secondary: HeroLink;
}) {
  return (
    <div className="pb-2 md:pb-16">
      {heading && HEADING}
      {poster && (
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
        <p className="mt-2 flex items-center gap-3 text-matcha-lime">
          <span className={cn(posterFont.className, "text-7xl leading-none md:text-8xl")}>
            {stat[0]}
          </span>
          <span className="font-bold text-lg leading-tight md:text-xl">
            {stat[1]}
            <br />
            {stat[2]}
          </span>
        </p>
      )}
      <p className="mt-5 max-w-md text-base text-matcha-forest-foreground/85 md:text-lg">{lead}</p>
      {note && (
        <p className="mt-3 max-w-md text-sm font-semibold text-matcha-lime md:text-base">{note}</p>
      )}
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href={primary.href}
          className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-matcha-paper px-6 font-bold text-matcha-forest transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none"
        >
          {primary.label}
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden
          />
        </Link>
        <Link
          href={secondary.href}
          className="inline-flex min-h-12 items-center rounded-full border-2 border-matcha-lime px-6 font-bold text-matcha-forest-foreground transition-colors hover:bg-matcha-lime hover:text-matcha-forest"
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

  const packshots = (className?: string) => (
    <div className={cn("relative h-[260px] sm:h-[340px] md:h-[440px]", className)} aria-hidden>
      <div className="absolute inset-x-[8%] bottom-[-18%] h-[70%] rounded-[50%] bg-matcha-forest-foreground/[0.07]" />
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
          className={cn("absolute w-auto drop-shadow-[0_28px_24px_rgba(0,0,0,0.32)]", p.className)}
        />
      ))}
    </div>
  );
  const grid = "container mx-auto grid items-end gap-2 px-4 pt-8 md:grid-cols-2 md:gap-8 md:pt-14";
  const everydayGrid = (
    <div className={grid}>
      {everyday}
      {packshots()}
    </div>
  );

  return (
    <section
      aria-labelledby="home-h1"
      className="overflow-hidden bg-matcha-forest text-matcha-forest-foreground"
    >
      {campaign?.hero ? (
        <CampaignWindow
          startsAt={campaign.startsAt.toISOString()}
          endsAt={campaign.endsAt.toISOString()}
          fallback={everydayGrid}
        >
          <div className={grid}>
            <div className="md:col-span-2">{HEADING}</div>
            {/* One line across the band; the products stand in front of its right end */}
            <p
              className={cn(
                posterFont.className,
                "whitespace-nowrap text-center text-[17.5vw] uppercase leading-[0.85] tracking-[0.005em] md:col-span-2 xl:text-[15rem]",
              )}
            >
              {campaign.hero.poster.join(" ")}
            </p>
            <HeroCopy
              poster={null}
              heading={false}
              stat={campaign.hero.stat}
              lead={campaign.hero.lead}
              note={cartDiscount}
              primary={{ href: "/katalog?promocje=1", label: "Zobacz obniżki" }}
              secondary={{ href: `#${campaign.id}-h`, label: campaign.title }}
            />
            {packshots("z-10 md:-mt-36 md:h-[520px] lg:-mt-44 lg:h-[560px]")}
          </div>
        </CampaignWindow>
      ) : (
        everydayGrid
      )}
    </section>
  );
}
