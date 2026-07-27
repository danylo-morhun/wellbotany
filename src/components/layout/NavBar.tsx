import { PillBottle, Search, ShoppingBag, Truck, User } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CartIcon } from "@/features/cart/components/CartIcon";
import { WishlistIcon, WishlistIconFallback } from "@/features/wishlist/components/WishlistIcon";
import { auth } from "@/lib/auth";

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

export async function NavBar() {
  const session = await auth();
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
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <PillBottle className="size-4" />
            </span>
            <span className="hidden text-lg font-extrabold tracking-tight text-foreground sm:inline">
              Twoje Zdrowie
            </span>
          </Link>

          <search className="hidden flex-1 justify-center md:flex">
            <form action="/katalog" className="relative w-full max-w-lg">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="szukaj"
                placeholder="Szukaj witamin, suplementów…"
                aria-label="Szukaj produktów"
                className="w-full rounded-full border border-border bg-muted/60 py-2.5 pl-11 pr-4 text-sm text-foreground transition-shadow duration-200 placeholder:text-muted-foreground focus:border-transparent focus:bg-card focus:shadow-card focus:outline-none focus:ring-2 focus:ring-ring/50 motion-reduce:transition-none"
              />
            </form>
          </search>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 md:ml-0">
            <ThemeToggle />
            <Suspense fallback={<WishlistIconFallback />}>
              <WishlistIcon />
            </Suspense>
            <Suspense
              fallback={
                <span className="rounded-full p-2.5 text-muted-foreground">
                  <ShoppingBag className="size-5" />
                </span>
              }
            >
              <CartIcon />
            </Suspense>
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin/zamowienia"
                className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
              >
                Admin
              </Link>
            )}
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
