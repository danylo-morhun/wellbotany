import { Truck, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AdminLink } from "@/components/layout/AdminLink";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileSearch } from "@/components/layout/MobileSearch";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CartIconClient } from "@/features/cart/components/CartIconClient";
import { getCategories } from "@/features/catalog/actions";
import { HeaderSearch } from "@/features/catalog/components/HeaderSearch";
import { getListingFlags } from "@/features/catalog/lib/listing-flags";
import { buildCategoryNav } from "@/features/catalog/lib/nav";
import { getPopularIngredients } from "@/features/catalog/lib/popular-ingredients";
import { PromoBar } from "@/features/promotions/components/PromoBar";
import { isTierPromoLive } from "@/features/promotions/lib/tiered";
import { getShopSettings, ordersPausedMessage } from "@/features/settings/lib/shop-settings";
import { WishlistIconClient } from "@/features/wishlist/components/WishlistIconClient";
import { formatPriceCompact } from "@/lib/format";
import { headerIconClass } from "./header-icon";

const NEW_ARRIVALS_HREF = "/katalog?nowosci=1";

const navLinks = [
  { label: "Katalog", href: "/katalog" },
  { label: "Nowości", href: NEW_ARRIVALS_HREF },
  { label: "Zestawy prezentowe", href: "/zestawy-prezentowe" },
];

const utilityLinks = [
  { label: "Poradnik", href: "/poradnik" },
  { label: "Dostawa", href: "/dostawa" },
  { label: "FAQ", href: "/faq" },
  { label: "Kontakt", href: "/kontakt" },
];

export async function NavBar() {
  const [categories, settings, { hasPromos, hasNewArrivals }, popularIngredients] =
    await Promise.all([
      getCategories(),
      getShopSettings(),
      getListingFlags(),
      getPopularIngredients(),
    ]);
  const { freeShippingThresholdPln, ordersPaused, tierPromo } = settings;
  const nav = buildCategoryNav(categories);
  const mobileLinks = navLinks.filter((l) => hasNewArrivals || l.href !== NEW_ARRIVALS_HREF);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm print:hidden">
        {ordersPaused && (
          <p
            role="status"
            className="bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground"
          >
            {ordersPausedMessage(settings)}
          </p>
        )}
        {tierPromo && !ordersPaused && (
          <PromoBar promo={tierPromo} initiallyLive={isTierPromoLive(tierPromo)} />
        )}
        {/* Utility bar */}
        <div className="bg-band text-band-foreground">
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-xs font-medium sm:px-6 lg:px-8">
            <p className="flex items-center gap-1.5">
              {freeShippingThresholdPln !== null && !ordersPaused && (
                <>
                  <Truck className="size-3.5" strokeWidth={2} aria-hidden />
                  Darmowa dostawa od {formatPriceCompact(freeShippingThresholdPln)}
                </>
              )}
            </p>
            <nav aria-label="Informacje" className="hidden items-center gap-5 sm:flex">
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
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-1 px-4 sm:gap-4 sm:px-6 lg:gap-6 lg:px-8">
            <MobileMenu
              navLinks={mobileLinks}
              utilityLinks={utilityLinks}
              nav={nav}
              showPromos={hasPromos}
            />
            <Link href="/" className="flex min-w-0 shrink items-center">
              <Image
                src="/branding/logo-horizontal.svg"
                alt="Well Botany"
                width={177}
                height={31}
                priority
                className="h-6 w-auto min-[400px]:h-7 sm:h-8 dark:hidden"
              />
              <Image
                src="/branding/logo-horizontal-white.svg"
                alt="Well Botany"
                width={177}
                height={31}
                priority
                className="hidden h-6 w-auto min-[400px]:h-7 sm:h-8 dark:block"
              />
            </Link>

            <search className="hidden flex-1 justify-center md:flex">
              <HeaderSearch className="w-full max-w-lg" />
            </search>

            {/* On phones theme and wishlist move into the mobile menu so the row fits */}
            <div className="ml-auto flex shrink-0 items-center gap-0.5 md:ml-0">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              <div className="hidden sm:block">
                <WishlistIconClient />
              </div>
              <CartIconClient />
              <AdminLink />
              <Link href="/konto" aria-label="Moje konto" className={headerIconClass}>
                <User className="size-5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        {nav.length > 0 && <MegaMenu nav={nav} showPromos={hasPromos} />}
      </header>
      <MobileSearch ingredients={popularIngredients} />
    </>
  );
}
