import type { Metadata } from "next";
import { BestsellerTabs } from "@/app/(shop)/components/BestsellerTabs";
import { BrandStrip } from "@/app/(shop)/components/BrandStrip";
import { FadeInView } from "@/app/(shop)/components/FadeInView";
import { HelpAndGuides } from "@/app/(shop)/components/HelpAndGuides";
import { HomeAbout } from "@/app/(shop)/components/HomeAbout";
import { HomeBand } from "@/app/(shop)/components/HomeBand";
import { HomeHero } from "@/app/(shop)/components/HomeHero";
import { HomeIntro } from "@/app/(shop)/components/HomeIntro";
import { HomeNewArrivals } from "@/app/(shop)/components/HomeNewArrivals";
import { HomePromos } from "@/app/(shop)/components/HomePromos";
import { IngredientTiles } from "@/app/(shop)/components/IngredientTiles";
import { NewsletterSection } from "@/app/(shop)/components/NewsletterSection";
import { TrustStrip } from "@/app/(shop)/components/TrustStrip";
import { getBrands } from "@/features/catalog/actions";
import { getHomepageData } from "@/features/catalog/lib/homepage";
import { getHomeGiftSets } from "@/features/gift-sets/lib/homepage";
import { getHomeBanners } from "@/features/home/lib/banners";
import { HideIfSubscribed } from "@/features/newsletter/components/HideIfSubscribed";

export const metadata: Metadata = {
  title: { absolute: "Suplementy diety, witaminy i zioła – sklep Well Botany" },
  alternates: { canonical: "/" },
};

// Banners open/close on their dates without an admin edit
export const revalidate = 3600;

export default async function HomePage() {
  const [
    { categories, tabs, newArrivals, promos, ingredientTiles },
    banners,
    brands,
    { giftSets, builderActive },
  ] = await Promise.all([getHomepageData(), getHomeBanners(), getBrands(), getHomeGiftSets()]);

  // Gift sets no longer get a band; they take a free hero side slot
  const giftTile =
    giftSets.length > 0
      ? { href: "/zestawy-prezentowe", label: "Zobacz zestawy" }
      : builderActive
        ? { href: "/zestawy-prezentowe/stworz", label: "Złóż własny zestaw" }
        : null;

  // Hero → trust → H1 + categories read as one opening group (tight spacing);
  // the bands after it alternate plain/mint
  return (
    <>
      <HomeBand className="pt-4 md:pt-6">
        <HomeHero banners={banners} giftTile={giftTile} />
      </HomeBand>
      <HomeBand className="pt-4 pb-2 md:pt-5">
        <TrustStrip />
      </HomeBand>
      <HomeBand className="pt-6 pb-8 md:pt-10 md:pb-14">
        <HomeIntro categories={categories} />
      </HomeBand>
      <HomeBand tone="mint" className="py-8 md:py-14">
        <BestsellerTabs tabs={tabs} />
      </HomeBand>
      {promos.length > 0 && (
        <HomeBand className="py-8 md:py-14">
          <FadeInView>
            <HomePromos products={promos} />
          </FadeInView>
        </HomeBand>
      )}
      <HomeBand tone="mint" className="py-8 md:py-14">
        <FadeInView>
          <HelpAndGuides categories={categories} />
        </FadeInView>
      </HomeBand>
      <HomeBand className="py-8 md:py-14">
        <FadeInView className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <IngredientTiles tiles={ingredientTiles} />
          <BrandStrip brands={brands} />
        </FadeInView>
      </HomeBand>
      <HomeBand tone="mint" className="py-8 md:py-14">
        <FadeInView>
          <HomeNewArrivals products={newArrivals} />
        </FadeInView>
      </HomeBand>
      <HideIfSubscribed>
        <HomeBand className="pt-8 md:pt-14">
          <FadeInView>
            <NewsletterSection />
          </FadeInView>
        </HomeBand>
      </HideIfSubscribed>
      <HomeBand className="py-8 md:py-14">
        <HomeAbout />
      </HomeBand>
    </>
  );
}
