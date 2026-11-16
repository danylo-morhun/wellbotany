import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { posterFont } from "./poster-font";

// Seasonal copy: change the poster words and lead with the season (posts use the same)
const HERO = {
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

type Props = { productCount: number; hasDeals: boolean };

/** Opening band in the posts' Matcha look: the page's H1 as a small line, the season
 * as a poster word, two ways in, and a staged group of products. */
export function HomeHero({ productCount, hasDeals }: Props) {
  // Rounded down, so "ponad" stays true between cache refreshes
  const shown = Math.floor(productCount / 100) * 100;

  return (
    <section
      aria-labelledby="home-h1"
      className="overflow-hidden bg-matcha-forest text-matcha-forest-foreground"
    >
      <div className="container mx-auto grid items-end gap-2 px-4 pt-8 md:grid-cols-2 md:gap-8 md:pt-14">
        <div className="pb-2 md:pb-16">
          <h1 id="home-h1" className="text-sm font-semibold text-matcha-lime md:text-base">
            Suplementy diety, zioła i zdrowa żywność
          </h1>
          <p
            className={cn(
              posterFont.className,
              "mt-3 text-[clamp(3.75rem,10vw,8.25rem)] uppercase leading-[0.88] tracking-[0.005em]",
            )}
          >
            {HERO.poster[0]}
            <br />
            {HERO.poster[1]}
          </p>
          <p className="mt-5 max-w-md text-base text-matcha-forest-foreground/85 md:text-lg">
            {HERO.lead}
            {shown >= 100 && ` Ponad ${shown} produktów z pełnym składem.`}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/zestawy-prezentowe"
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-matcha-paper px-6 font-bold text-matcha-forest transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none"
            >
              Zestawy prezentowe
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden
              />
            </Link>
            <Link
              href={hasDeals ? "#teraz-taniej" : "/kategoria/zywnosc"}
              className="inline-flex min-h-12 items-center rounded-full border-2 border-matcha-lime px-6 font-bold text-matcha-forest-foreground transition-colors hover:bg-matcha-lime hover:text-matcha-forest"
            >
              {hasDeals ? "Teraz taniej" : "Zdrowa żywność"}
            </Link>
          </div>
        </div>
        <div className="relative h-[260px] sm:h-[340px] md:h-[440px]" aria-hidden>
          <div className="absolute inset-x-[8%] bottom-[-18%] h-[70%] rounded-[50%] bg-matcha-forest-foreground/[0.07]" />
          {PRODUCTS.map((p, i) => (
            <Image
              key={p.src}
              src={p.src}
              alt=""
              width={p.width}
              height={p.height}
              // LCP: the hero group paints first
              priority={i < 2}
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
