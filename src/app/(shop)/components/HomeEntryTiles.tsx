import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatPriceCompact, pluralizeProducts } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  supplementsCount: number;
  foodCount: number;
  /** Cheapest curated gift set, in grosz; null when only the builder is on */
  giftFromPln: number | null;
};

const floorHundreds = (n: number) => Math.floor(n / 100) * 100;

/** Three doors under the hero: the shop is supplements, food and gifts. */
export function HomeEntryTiles({ supplementsCount, foodCount, giftFromPln }: Props) {
  const tiles = [
    {
      href: "/katalog",
      title: "Suplementy",
      note:
        supplementsCount >= 100
          ? `${floorHundreds(supplementsCount)}+ z pełnym składem`
          : "z pełnym składem i dawką",
      img: { src: "/images/home/healthlabs-ashwame.webp", width: 272, height: 440 },
      tone: "bg-matcha-ground",
    },
    {
      href: "/kategoria/zywnosc",
      title: "Zdrowa żywność",
      note:
        foodCount > 0
          ? `${foodCount} ${pluralizeProducts(foodCount)}: czekolady, przekąski, kawa`
          : "czekolady, przekąski, kawa",
      img: { src: "/images/home/megusto-krowki-kokos.webp", width: 366, height: 440 },
      tone: "bg-card shadow-card",
    },
    {
      href: "/zestawy-prezentowe",
      title: "Na prezent",
      note: giftFromPln ? `zestawy od ${formatPriceCompact(giftFromPln)}` : "złóż własny zestaw",
      img: { src: "/images/home/santini-serce-mleczna.webp", width: 421, height: 400 },
      tone: "bg-matcha-tint",
    },
  ];

  return (
    <section aria-label="Działy sklepu" className="grid gap-3 sm:grid-cols-3 md:gap-5">
      {tiles.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-[1.75rem] p-5 text-matcha-ink transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:min-h-56 md:p-7",
            t.tone,
          )}
        >
          <span className="relative z-10 max-w-[62%]">
            <span className="block font-heading text-2xl font-bold tracking-tight md:text-3xl">
              {t.title}
            </span>
            <span className="mt-1 block text-sm text-matcha-muted">{t.note}</span>
          </span>
          <span className="relative z-10 mt-4 inline-flex items-center gap-1.5 text-sm font-bold">
            Przeglądaj
            <ArrowRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
          </span>
          <Image
            src={t.img.src}
            alt=""
            width={t.img.width}
            height={t.img.height}
            sizes="(min-width: 640px) 12vw, 30vw"
            className="absolute -bottom-3 right-4 h-[78%] w-auto rotate-[4deg] drop-shadow-[0_18px_16px_rgba(0,0,0,0.18)] transition-transform duration-300 group-hover:rotate-0 motion-reduce:transition-none md:right-6"
          />
        </Link>
      ))}
    </section>
  );
}
