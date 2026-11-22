"use client";

import Image from "next/image";
import type { TouchEvent } from "react";
import { useState } from "react";
import { imagesForVariant } from "../lib/variant-images";
import { useVariantSelection } from "./VariantSelection";

type GalleryImage = {
  id: string;
  url: string;
  altPl: string | null;
  isMain: boolean;
  variantId: string | null;
};

type Props = {
  images: GalleryImage[];
  productName: string;
};

/** Remounted per variant (see key) so the active photo resets to that variant's first. */
export function ProductGallery(props: Props) {
  const selectedId = useVariantSelection()?.selectedId ?? null;
  return <VariantGallery key={selectedId ?? "all"} {...props} variantId={selectedId} />;
}

function VariantGallery({ images, productName, variantId }: Props & { variantId: string | null }) {
  const fallback = imagesForVariant(images, variantId);
  const mainIndex = fallback.findIndex((img) => img.isMain);
  const [active, setActiveIndex] = useState(mainIndex >= 0 ? mainIndex : 0);
  // Slide direction of the last change: 1 = from the right, -1 = from the left,
  // 0 = not changed yet (first paint is the LCP image — never animate it)
  const [dir, setDir] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const setActive = (next: number | ((i: number) => number)) =>
    setActiveIndex((i) => {
      const n = typeof next === "function" ? next(i) : next;
      if (n !== i) setDir(n > i ? 1 : -1);
      return n;
    });

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) =>
    setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStart === null) return;
    const delta = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) setActive((i) => Math.min(i + 1, fallback.length - 1));
      else setActive((i) => Math.max(i - 1, 0));
    }
    setTouchStart(null);
  };

  if (fallback.length === 0) {
    return (
      <div className="aspect-square w-full rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
        <span className="text-sm">Brak zdjęcia</span>
      </div>
    );
  }

  const current = fallback[active];

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-square overflow-hidden rounded-xl bg-card dark:shadow-card"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          key={current.id}
          src={current.url}
          alt={current.altPl ?? productName}
          fill
          style={{ "--gallery-dir": dir } as React.CSSProperties}
          // Page gutter is 1rem per side below sm — at DPR 3 this picks 1080 w instead of 1920 w
          sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc(100vw - 3rem), 600px"
          className={`object-contain ${dir ? "animate-gallery-in motion-reduce:animate-none" : ""}`}
          // LCP element on mobile: preload + high fetch priority (`priority` alone no longer sets it)
          preload
          fetchPriority="high"
        />
      </div>

      {fallback.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fallback.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(index)}
              className={`relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-press active:scale-[0.95] motion-reduce:active:scale-100 ${
                index === active ? "border-primary" : "border-transparent"
              }`}
              aria-label={`Zdjęcie ${index + 1}`}
              aria-current={index === active || undefined}
            >
              <Image
                src={img.url}
                alt={img.altPl ?? productName}
                fill
                sizes="64px"
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
