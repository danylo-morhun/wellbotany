import { ArrowRight, BadgePercent, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ProductListItem } from "@/features/catalog/actions";
import { formatPrice } from "@/lib/format";

type Props = {
  product?: ProductListItem | null;
};

export function HeroSection({ product = null }: Props) {
  const variant = product?.variants[0];
  const image = product?.images[0];

  return (
    <section className="grid gap-4 lg:grid-cols-3" aria-labelledby="hero-heading">
      {/* Main panel */}
      <div className="relative flex flex-col justify-center overflow-hidden rounded-3xl bg-secondary px-6 py-12 md:px-10 md:py-16 lg:col-span-2">
        {/* Ambient decorative circles */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 animate-float-soft motion-reduce:animate-none"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-10 right-1/3 size-28 rounded-full bg-accent/20 animate-float-soft motion-reduce:animate-none"
          style={{ animationDelay: "1.2s" }}
          aria-hidden="true"
        />

        <div className="relative z-10 grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div className="max-w-xl">
            <h1
              id="hero-heading"
              className="mb-4 animate-fade-up text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground motion-reduce:animate-none md:text-5xl"
            >
              Twoje zdrowie zaczyna się <span className="text-primary">tutaj</span>
            </h1>
            <p
              className="mb-8 max-w-[52ch] animate-fade-up text-lg text-muted-foreground motion-reduce:animate-none"
              style={{ animationDelay: "80ms" }}
            >
              Certyfikowane suplementy diety, witaminy i produkty bio. Sprawdzona jakość, uczciwe
              ceny.
            </p>
            <div
              className="flex animate-fade-up flex-wrap gap-3 motion-reduce:animate-none"
              style={{ animationDelay: "160ms" }}
            >
              <Link
                href="/katalog"
                className="group rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-200 hover:bg-primary-deep active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Przeglądaj produkty
                <ArrowRight className="ml-1.5 inline size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" />
              </Link>
              <Link
                href="/katalog?kategoria=witaminy"
                className="rounded-full bg-card px-7 py-3 text-sm font-semibold text-foreground shadow-card transition-[box-shadow,transform] duration-200 hover:shadow-card-hover active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Witaminy i minerały
              </Link>
            </div>
          </div>

          {product && image && variant && (
            <Link
              href={`/produkt/${product.slug}`}
              className="group relative hidden w-64 animate-fade-up rounded-2xl bg-card p-4 shadow-float transition-transform duration-200 ease-out hover:-translate-y-1 md:block motion-reduce:animate-none motion-reduce:hover:translate-y-0"
              style={{ animationDelay: "240ms" }}
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-card">
                <Image
                  src={image.url}
                  alt={image.altPl ?? product.namePl}
                  fill
                  priority
                  sizes="256px"
                  className="object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
                />
              </div>
              <div className="mt-3">
                {product.brand && (
                  <p className="text-xs font-medium text-muted-foreground">{product.brand.name}</p>
                )}
                <p className="line-clamp-1 text-sm font-semibold text-foreground">
                  {product.namePl}
                </p>
                <p className="mt-1 text-base font-bold text-primary">
                  {formatPrice(variant.pricePln)}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Side tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:grid-rows-2">
        <Link
          href="/katalog?promocje=1"
          className="group flex flex-col justify-between overflow-hidden rounded-3xl bg-accent p-6 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <BadgePercent
            className="size-8 text-accent-foreground transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100"
            strokeWidth={1.75}
          />
          <div className="mt-6">
            <h2 className="text-xl font-bold tracking-tight text-accent-foreground">Promocje</h2>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-accent-foreground/80">
              Sprawdź obniżone ceny
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0" />
            </p>
          </div>
        </Link>

        <Link
          href="/katalog?nowosci=1"
          className="group flex flex-col justify-between overflow-hidden rounded-3xl bg-card p-6 shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <Sparkles
            className="size-8 text-primary transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100"
            strokeWidth={1.75}
          />
          <div className="mt-6">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Nowości</h2>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-muted-foreground">
              Ostatnio dodane produkty
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0" />
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
