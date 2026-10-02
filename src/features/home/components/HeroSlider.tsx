"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { HomeBannerItem } from "../lib/banners";

const AUTOPLAY_MS = 5000;

type Props = { banners: HomeBannerItem[] };

/** Full-width photo slider. A scroll-snap track gives native swipe on touch;
 * autoplay pauses on hover/focus and is off for reduced motion. */
export function HeroSlider({ banners }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const next = (index + count) % count;
      track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    },
    [count],
  );

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => setActive(Math.round(track.scrollLeft / track.clientWidth));
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => goTo(active + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [active, paused, count, goTo]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="karuzela"
      aria-label="Oferty"
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((banner, i) => (
          <Slide
            key={banner.id}
            banner={banner}
            index={i}
            count={count}
            priority={i === 0}
            hidden={i !== active}
          />
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="Poprzedni slajd"
            className="absolute left-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-float transition-colors hover:bg-card md:flex"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="Następny slajd"
            className="absolute right-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-float transition-colors hover:bg-card md:flex"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
          {/* Dark pill keeps the white dots visible on light photos */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 rounded-full bg-black/25 px-1 backdrop-blur-sm md:bottom-5">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Slajd ${i + 1}: ${banner.titlePl}`}
                aria-current={i === active}
                className="flex h-7 min-w-6 items-center justify-center px-0.5"
              >
                <span
                  className={cn(
                    "block h-2.5 rounded-full bg-white shadow-sm transition-[width,opacity] duration-300 motion-reduce:transition-none",
                    i === active ? "w-7 opacity-100" : "w-2.5 opacity-60",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Slide({
  banner,
  index,
  count,
  priority,
  hidden,
}: {
  banner: HomeBannerItem;
  index: number;
  count: number;
  priority: boolean;
  hidden: boolean;
}) {
  const alt = banner.altPl ?? banner.titlePl;
  const common = { alt, priority, fill: true, sizes: "100vw" } as const;
  const desktop = getImageProps({ ...common, src: banner.imageDesktopUrl }).props;
  const mobile = getImageProps({
    ...common,
    src: banner.imageMobileUrl ?? banner.imageDesktopUrl,
  }).props;

  const light = banner.textTone === "LIGHT";
  const right = banner.textPosition === "RIGHT";

  return (
    <Link
      href={banner.href}
      aria-roledescription="slajd"
      aria-label={`${index + 1} z ${count}: ${banner.titlePl}`}
      tabIndex={hidden ? -1 : undefined}
      className="relative block aspect-[3/2] w-full shrink-0 snap-start overflow-hidden bg-secondary md:aspect-[1920/710] md:max-h-[440px]"
    >
      <picture>
        <source media="(min-width: 768px)" srcSet={desktop.srcSet} sizes="100vw" />
        <img {...mobile} alt={alt} className="object-cover" />
      </picture>
      {/* Scrim on the text side keeps the headline readable on any photo.
          Phone: text on top (photos keep products in the lower part); desktop: left/right */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0",
          light
            ? "bg-gradient-to-b from-black/60 via-black/15 to-transparent"
            : "bg-gradient-to-b from-white/75 via-white/20 to-transparent",
          light
            ? right
              ? "md:bg-gradient-to-l md:from-black/60 md:via-black/25"
              : "md:bg-gradient-to-r md:from-black/60 md:via-black/25"
            : right
              ? "md:bg-gradient-to-l md:from-white/80 md:via-white/30"
              : "md:bg-gradient-to-r md:from-white/80 md:via-white/30",
        )}
      />
      <div
        className={cn(
          "absolute inset-x-4 top-4 flex flex-col items-start gap-2 md:inset-x-auto md:top-1/2 md:w-[min(30%,420px)] md:-translate-y-1/2 md:gap-4",
          right ? "md:right-[7%]" : "md:left-[7%]",
          light ? "text-white" : "text-foreground",
        )}
      >
        <p className="text-balance font-heading text-2xl font-extrabold leading-tight tracking-tight drop-shadow-md md:text-[2.75rem] lg:text-5xl">
          {banner.titlePl}
        </p>
        {banner.subtitlePl && (
          <p className="hidden max-w-[44ch] text-lg font-medium md:block">{banner.subtitlePl}</p>
        )}
        {banner.ctaLabelPl && (
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card md:px-6 md:py-3 md:text-base">
            {banner.ctaLabelPl}
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </Link>
  );
}
