import type { Metadata } from "next";
import { BestsellerTabs } from "@/app/(shop)/components/BestsellerTabs";
import { BrandStrip } from "@/app/(shop)/components/BrandStrip";
import { FadeInView } from "@/app/(shop)/components/FadeInView";
import { HelpAndGuides } from "@/app/(shop)/components/HelpAndGuides";
import { HerbalistPicks } from "@/app/(shop)/components/HerbalistPicks";
import { HomeAbout } from "@/app/(shop)/components/HomeAbout";
import { HomeBand } from "@/app/(shop)/components/HomeBand";
import { HomeCampaign } from "@/app/(shop)/components/HomeCampaign";
import { HomeDeals } from "@/app/(shop)/components/HomeDeals";
import { HomeEntryTiles } from "@/app/(shop)/components/HomeEntryTiles";
import { HomeFoodShelf } from "@/app/(shop)/components/HomeFoodShelf";
import { HomeGiftSets } from "@/app/(shop)/components/HomeGiftSets";
import { HomeHero } from "@/app/(shop)/components/HomeHero";
import { HomeIntro } from "@/app/(shop)/components/HomeIntro";
import { HomeNewArrivals } from "@/app/(shop)/components/HomeNewArrivals";
import { IngredientTiles } from "@/app/(shop)/components/IngredientTiles";
import { NewsletterSection } from "@/app/(shop)/components/NewsletterSection";
import { TrustStrip } from "@/app/(shop)/components/TrustStrip";
import { getBrands } from "@/features/catalog/actions";
import { getHomepageData } from "@/features/catalog/lib/homepage";
import { getHomeGiftSets } from "@/features/gift-sets/lib/homepage";
import { HeroSlider } from "@/features/home/components/HeroSlider";
import { getHomeBanners } from "@/features/home/lib/banners";
import { campaignToRender } from "@/features/home/lib/campaign";
import { HideIfSubscribed } from "@/features/newsletter/components/HideIfSubscribed";

export const metadata: Metadata = {
  title: { absolute: "Suplementy diety, zioła i zdrowa żywność – sklep Well Botany" },
  alternates: { canonical: "/" },
};

// Banners open/close on their dates without an admin edit
export const revalidate = 3600;

export default async function HomePage() {
  const [
    {
      categories,
      tabs,
      newArrivals,
      deals,
      picks,
      campaignProducts,
      ingredientTiles,
      foodShelf,
      foodCategories,
      productCount,
      foodCount,
    },
    banners,
    brands,
    { giftSets, builderActive },
  ] = await Promise.all([getHomepageData(), getHomeBanners(), getBrands(), getHomeGiftSets()]);

  // While a campaign runs it shows the biggest reductions; "Teraz taniej" would repeat them
  const campaign = campaignToRender();
  const giftFromPln = giftSets.length > 0 ? Math.min(...giftSets.map((gs) => gs.pricePln)) : null;

  // Bands after the opening alternate mint/plain (DESIGN.md §5)
  const rest = [
    (giftSets.length > 0 || builderActive) && (
      <FadeInView key="gifts">
        <HomeGiftSets giftSets={giftSets} builderActive={builderActive} />
      </FadeInView>
    ),
    picks.length > 0 && (
      <FadeInView key="picks">
        <HerbalistPicks picks={picks} />
      </FadeInView>
    ),
    <FadeInView key="food">
      <HomeFoodShelf products={foodShelf} categories={foodCategories} />
    </FadeInView>,
    <FadeInView key="tabs">
      <BestsellerTabs tabs={tabs} />
    </FadeInView>,
    <FadeInView key="help">
      <HelpAndGuides categories={categories} />
    </FadeInView>,
    <HomeIntro key="intro" categories={categories} headline={false} />,
    <FadeInView key="ingredients" className="grid gap-10 lg:grid-cols-2 lg:gap-12">
      <IngredientTiles tiles={ingredientTiles} />
      <BrandStrip brands={brands} />
    </FadeInView>,
    <FadeInView key="new">
      <HomeNewArrivals products={newArrivals} />
    </FadeInView>,
  ].filter(Boolean);

  // Hero, three doors, campaigns, then the deals: the first screen sells
  return (
    <>
      <HomeHero productCount={productCount} hasDeals={!campaign && deals.length > 0} />
      <HomeBand className="pt-5 md:pt-8">
        <HomeEntryTiles
          supplementsCount={productCount - foodCount}
          foodCount={foodCount}
          giftFromPln={giftFromPln}
        />
      </HomeBand>
      {banners.length > 0 && (
        <HomeBand className="pt-5 md:pt-8">
          <section aria-label="Kampanie" className="overflow-hidden rounded-[1.75rem]">
            <HeroSlider banners={banners} />
          </section>
        </HomeBand>
      )}
      <HomeBand className="pt-8 md:pt-12">
        {campaign ? (
          <HomeCampaign campaign={campaign} products={campaignProducts} />
        ) : (
          <HomeDeals products={deals} />
        )}
      </HomeBand>
      <HomeBand className="pt-6 pb-8 md:pt-8 md:pb-14">
        <TrustStrip slim />
      </HomeBand>
      {rest.map((node, i) => (
        <HomeBand
          key={(node as React.ReactElement).key}
          tone={i % 2 === 0 ? "plain" : "mint"}
          className="py-8 md:py-14"
        >
          {node}
        </HomeBand>
      ))}
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
