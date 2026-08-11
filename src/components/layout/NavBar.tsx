import { ShoppingCart, Truck, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLink } from "@/components/layout/AdminLink";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CartIcon } from "@/features/cart/components/CartIcon";
import { HeaderSearch } from "@/features/catalog/components/HeaderSearch";
import { WishlistIcon, WishlistIconFallback } from "@/features/wishlist/components/WishlistIcon";

const navLinks = [
  { label: "Katalog", href: "/katalog" },
  { label: "Kategorie", href: "/kategorie" },
  { label: "Marki", href: "/marki" },
  { label: "Nowości", href: "/katalog?nowosci=1" },
  { label: "Zestawy prezentowe", href: "/zestawy-prezentowe" },
];

const utilityLinks = [
  { label: "Dostawa", href: "/dostawa" },
  { label: "FAQ", href: "/faq" },
  { label: "Kontakt", href: "/kontakt" },
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm print:hidden">
      {/* Utility bar */}
      <div className="bg-band text-band-foreground">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-xs font-medium sm:px-6 lg:px-8">
          <p className="flex items-center gap-1.5">
            <Truck className="size-3.5" strokeWidth={2} />
            Darmowa dostawa od 200 zł
          </p>
          <nav className="hidden items-center gap-5 sm:flex">
            {utilityLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-band-foreground/80 transition-colors hover:text-band-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main row */}
      <div className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
          <MobileMenu navLinks={navLinks} utilityLinks={utilityLinks} />
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/branding/logo-horizontal.svg"
              alt="Well Botany"
              width={177}
              height={31}
              priority
              className="h-8 w-auto"
            />
          </Link>

          <search className="hidden flex-1 justify-center md:flex">
            <HeaderSearch className="w-full max-w-lg" />
          </search>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 md:ml-0">
            <ThemeToggle />
            <Suspense fallback={<WishlistIconFallback />}>
              <WishlistIcon />
            </Suspense>
            <Suspense
              fallback={
                <span className="rounded-full p-2.5 text-muted-foreground">
                  <ShoppingCart className="size-5" />
                </span>
              }
            >
              <CartIcon />
            </Suspense>
            <Suspense fallback={null}>
              <AdminLink />
            </Suspense>
            <Link
              href="/konto"
              aria-label="Moje konto"
              className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
            >
              <User className="size-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Category nav */}
      <nav className="hidden border-b border-border bg-card md:block">
        <div className="mx-auto flex h-11 max-w-7xl items-center gap-7 px-4 text-sm font-medium sm:px-6 lg:px-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/katalog?promocje=1"
            className="flex items-center gap-1.5 font-semibold text-foreground transition-colors hover:text-primary"
          >
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Promocje
          </Link>
        </div>
      </nav>
    </header>
  );
}
