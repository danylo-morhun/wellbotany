import { ChevronRight, Gift } from "lucide-react";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { preload } from "react-dom";
import type { HomeBannerItem } from "@/features/home/lib/banners";
import { cn } from "@/lib/utils";

type Props = {
  banners: HomeBannerItem[];
  /** Gift sets or the builder are live: may take a free side slot */
  giftTile: { href: string; label: string } | null;
};

const SIDE_SLOTS = 2;

/** Static hero, no autoplay (carousels get ~1% of clicks): the first active
 * banner as the main tile, the next two as side tiles. Phones show the main
 * banner and the side tiles as a compact 2-up row. */
export function HomeHero({ banners, giftTile }: Props) {
  const [main, ...rest] = banners;
  if (!main) return null;
  const sides = rest.slice(0, SIDE_SLOTS);
  const showGift = giftTile !== null && sides.length < SIDE_SLOTS;
  const sideCount = sides.length + (showGift ? 1 : 0);

  return (
    <section
      aria-label="Oferty"
      className={cn(
        "grid grid-cols-2 gap-3 md:gap-4",
        sideCount > 0 && "md:grid-cols-3 md:grid-rows-2",
      )}
    >
      <MainBanner banner={main} wide={sideCount === 0} />
      {sides.map((banner) => (
        <SideBanner key={banner.id} banner={banner} tall={sideCount === 1} />
      ))}
      {showGift && giftTile && <GiftTile {...giftTile} tall={sideCount === 1} />}
    </section>
  );
}

function MainBanner({ banner, wide }: { banner: HomeBannerItem; wide: boolean }) {
  const alt = banner.altPl ?? banner.titlePl;
  const desktopSizes = wide ? "(min-width: 768px) 100vw" : "(min-width: 768px) 66vw";
  const common = { alt, priority: true, fill: true, sizes: `${desktopSizes}, 100vw` } as const;
  const desktop = getImageProps({ ...common, src: banner.imageDesktopUrl }).props;
  const mobile = getImageProps({
    ...common,
    src: banner.imageMobileUrl ?? banner.imageDesktopUrl,
  }).props;
  // LCP image: getImageProps doesn't emit a preload, so each art-directed source
  // gets one for its own viewport
  const shared = { as: "image", imageSizes: common.sizes, fetchPriority: "high" } as const;
  preload(desktop.src, { ...shared, imageSrcSet: desktop.srcSet, media: "(min-width: 768px)" });
  preload(mobile.src, { ...shared, imageSrcSet: mobile.srcSet, media: "(max-width: 767px)" });

  const light = banner.textTone === "LIGHT";
  const right = banner.textPosition === "RIGHT";

  return (
    <Link
      href={banner.href}
      className={cn(
        "group relative col-span-2 block aspect-[16/10] overflow-hidden rounded-2xl bg-secondary md:aspect-[2.36/1]",
        !wide && "md:row-span-2",
        wide && "md:col-span-3 md:max-h-[440px] md:w-full",
      )}
    >
      <picture>
        <source media="(min-width: 768px)" srcSet={desktop.srcSet} sizes={common.sizes} />
        <img
          {...mobile}
          alt={alt}
          fetchPriority="high"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
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
          "absolute inset-x-4 top-4 flex flex-col items-start gap-2 md:inset-x-auto md:top-1/2 md:w-[min(36%,420px)] md:-translate-y-1/2 md:gap-3",
          right ? "md:right-[4%]" : "md:left-[4%]",
          light ? "text-white" : "text-foreground",
        )}
      >
        <p className="text-balance font-heading text-2xl font-extrabold leading-tight tracking-tight drop-shadow-md md:text-3xl xl:text-4xl">
          {banner.titlePl}
        </p>
        {banner.subtitlePl && (
          <p className="hidden max-w-[40ch] font-medium xl:block">{banner.subtitlePl}</p>
        )}
        {banner.ctaLabelPl && (
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card md:px-5 md:py-2.5">
            {banner.ctaLabelPl}
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </Link>
  );
}

const sideTileClass = (tall: boolean) =>
  cn(
    "group relative block aspect-[3/2] overflow-hidden rounded-2xl md:aspect-auto",
    // A lone side tile spans the phone row as a short strip, and both desktop rows
    tall && "max-md:col-span-2 max-md:aspect-[3/1] md:row-span-2",
  );

function SideBanner({ banner, tall }: { banner: HomeBannerItem; tall: boolean }) {
  const light = banner.textTone === "LIGHT";

  return (
    <Link href={banner.href} className={cn(sideTileClass(tall), "bg-secondary")}>
      {/* One wide crop fits both the desktop side tile and the phone 2-up tile */}
      <Image
        src={banner.imageDesktopUrl}
        alt=""
        fill
        sizes="(min-width: 768px) 33vw, 50vw"
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-gradient-to-t to-transparent",
          light ? "from-black/70 via-black/25" : "from-white/90 via-white/40",
        )}
      />
      <div
        className={cn(
          "absolute inset-x-3 bottom-3 flex flex-col items-start gap-1 md:inset-x-5 md:bottom-4",
          light ? "text-white" : "text-foreground",
        )}
      >
        <p className="text-balance text-sm font-bold leading-snug md:font-heading md:text-xl md:font-extrabold md:tracking-tight">
          {banner.titlePl}
        </p>
        {banner.ctaLabelPl && (
          <span className="hidden items-center gap-1 text-sm font-semibold md:inline-flex">
            {banner.ctaLabelPl}
            <ChevronRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              aria-hidden
            />
          </span>
        )}
      </div>
    </Link>
  );
}

function GiftTile({ href, label, tall }: { href: string; label: string; tall: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        sideTileClass(tall),
        "flex flex-col justify-between bg-primary p-3 text-primary-foreground md:p-5",
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15 md:size-12">
        <Gift className="size-5 md:size-6" aria-hidden />
      </span>
      <span className="flex flex-col items-start gap-1">
        <span className="text-sm font-bold leading-snug md:font-heading md:text-xl md:font-extrabold md:tracking-tight">
          Zestawy prezentowe
        </span>
        <span className="hidden items-center gap-1 text-sm font-semibold md:inline-flex">
          {label}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      </span>
    </Link>
  );
}
