import { ArrowLeft, Lock, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SELLER } from "@/lib/seller";

const phoneHref = `tel:${SELLER.phone.replace(/\s/g, "")}`;

/** Checkout header: no catalogue, search or promos to pull the shopper out of the form. */
export function CheckoutHeader() {
  return (
    <header className="border-b border-border bg-background print:hidden">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 shrink items-center">
          <Image
            src="/branding/logo-horizontal.svg"
            alt="Well Botany — strona główna"
            width={177}
            height={31}
            priority
            className="h-6 w-auto min-[400px]:h-7 dark:hidden"
          />
          <Image
            src="/branding/logo-horizontal-white.svg"
            alt="Well Botany — strona główna"
            width={177}
            height={31}
            priority
            className="hidden h-6 w-auto min-[400px]:h-7 dark:block"
          />
        </Link>

        <p className="ml-auto hidden items-center gap-1.5 text-sm font-medium text-foreground sm:flex">
          <Lock className="size-4 text-primary" aria-hidden />
          Bezpieczne zakupy
        </p>
        <a
          href={phoneHref}
          className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary md:flex"
        >
          <Phone className="size-4" aria-hidden />
          {SELLER.phone}
        </a>
        <Link
          href="/koszyk"
          className="ml-auto flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary-deep sm:ml-0"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Wróć do koszyka
        </Link>
      </div>

      {/* Phones: the trust line and phone get their own slim row instead of crowding the logo */}
      <div className="flex items-center justify-center gap-x-4 gap-y-1 border-t border-border/60 bg-secondary/60 px-4 py-1.5 text-xs md:hidden">
        <p className="flex items-center gap-1.5 font-medium sm:hidden">
          <Lock className="size-3.5 text-primary" aria-hidden />
          Bezpieczne zakupy
        </p>
        <a
          href={phoneHref}
          className="flex min-h-8 items-center gap-1.5 text-muted-foreground hover:text-primary"
        >
          <Phone className="size-3.5" aria-hidden />
          <span>
            <span className="sr-only">Pomoc przy zamówieniu: </span>
            {SELLER.phone}
          </span>
        </a>
      </div>
    </header>
  );
}
