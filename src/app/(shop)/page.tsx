import type { Metadata } from "next";
import { BestsellerTabs } from "@/app/(shop)/components/BestsellerTabs";
import { BrandStrip } from "@/app/(shop)/components/BrandStrip";
import { FadeInView } from "@/app/(shop)/components/FadeInView";
import { HelpAndGuides } from "@/app/(shop)/components/HelpAndGuides";
import { HomeAbout } from "@/app/(shop)/components/HomeAbout";
import { HomeBand } from "@/app/(shop)/components/HomeBand";
import { HomeCampaign } from "@/app/(shop)/components/HomeCampaign";
import { HomeFoodShelf } from "@/app/(shop)/components/HomeFoodShelf";
import { HomeGiftSets } from "@/app/(shop)/components/HomeGiftSets";
import { HomeHeadline } from "@/app/(shop)/components/HomeHeadline";
import { HomeIntro } from "@/app/(shop)/components/HomeIntro";
import { HomeNewArrivals } from "@/app/(shop)/components/HomeNewArrivals";
import { HomePromos } from "@/app/(shop)/components/HomePromos";
import { IngredientTiles } from "@/app/(shop)/components/IngredientTiles";
import { NewsletterSection } from "@/app/(shop)/components/NewsletterSection";
import { TrustStrip } from "@/app/(shop)/components/TrustStrip";
import { getBrands } from "@/features/catalog/actions";
import { getHomepageData, PROMO_TAB_ID } from "@/features/catalog/lib/homepage";
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
      promos,
      campaignProducts,
      ingredientTiles,
      foodShelf,
      foodCategories,
      productCount,
    },
    banners,
    brands,
    { giftSets, builderActive },
  ] = await Promise.all([getHomepageData(), getHomeBanners(), getBrands(), getHomeGiftSets()]);

  // While a campaign runs it takes the reductions; a second "Promocje" would repeat them
  const campaign = campaignToRender();

  // A running campaign already shows the biggest reductions under the shelf
  const shelfTabs = campaign ? tabs.filter((t) => t.id !== PROMO_TAB_ID) : tabs;

  // Bands after the opening alternate mint/plain (DESIGN.md §5)
  const rest = [
    (giftSets.length > 0 || builderActive) && (
      <FadeInView key="gifts">
        <HomeGiftSets giftSets={giftSets} builderActive={builderActive} />
      </FadeInView>
    ),
    <FadeInView key="food">
      <HomeFoodShelf products={foodShelf} categories={foodCategories} />
    </FadeInView>,
    <HomeIntro key="intro" categories={categories} headline={false} />,
    !campaign && promos.length > 0 && (
      <FadeInView key="promos">
        <HomePromos products={promos} />
      </FadeInView>
    ),
    <FadeInView key="help">
      <HelpAndGuides categories={categories} />
    </FadeInView>,
    <FadeInView key="ingredients" className="grid gap-10 lg:grid-cols-2 lg:gap-12">
      <IngredientTiles tiles={ingredientTiles} />
      <BrandStrip brands={brands} />
    </FadeInView>,
    <FadeInView key="new">
      <HomeNewArrivals products={newArrivals} />
    </FadeInView>,
  ].filter(Boolean);

  // Full-width slider, then products straight away: the first shelf sits right under it
  return (
    <>
      <HeroSlider banners={banners} />
      <HomeBand className="pt-5 md:pt-7">
        <HomeHeadline productCount={productCount} />
        <div className="mt-4 md:mt-5">
          <BestsellerTabs tabs={shelfTabs} lead />
        </div>
      </HomeBand>
      {campaign && (
        <HomeBand tone="mint" className="py-8 md:py-14">
          <HomeCampaign campaign={campaign} products={campaignProducts} />
        </HomeBand>
      )}
      <HomeBand className="pt-4 pb-8 md:pt-6 md:pb-14">
        <TrustStrip slim />
      </HomeBand>
      {rest.map((node, i) => (
        <HomeBand
          key={(node as React.ReactElement).key}
          tone={i % 2 === 0 ? "mint" : "plain"}
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
