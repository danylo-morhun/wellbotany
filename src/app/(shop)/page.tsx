import type { Metadata } from "next";
import { BestsellerRow } from "@/app/(shop)/components/BestsellerRow";
import { BrandStrip } from "@/app/(shop)/components/BrandStrip";
import { FadeInView } from "@/app/(shop)/components/FadeInView";
import { GuidesRow } from "@/app/(shop)/components/GuidesRow";
import { HomeAbout } from "@/app/(shop)/components/HomeAbout";
import { HomeBand } from "@/app/(shop)/components/HomeBand";
import { HomeGiftSets } from "@/app/(shop)/components/HomeGiftSets";
import { HomeIntro } from "@/app/(shop)/components/HomeIntro";
import { HomeNewArrivals } from "@/app/(shop)/components/HomeNewArrivals";
import { HomePromos } from "@/app/(shop)/components/HomePromos";
import { IngredientTiles } from "@/app/(shop)/components/IngredientTiles";
import { NewsletterSection } from "@/app/(shop)/components/NewsletterSection";
import { SeasonalShelf } from "@/app/(shop)/components/SeasonalShelf";
import { WhyUs } from "@/app/(shop)/components/WhyUs";
import { getBrands } from "@/features/catalog/actions";
import { getHomepageData, SEASONAL_SHELF } from "@/features/catalog/lib/homepage";
import { getHomeGiftSets } from "@/features/gift-sets/lib/homepage";
import { HeroSlider } from "@/features/home/components/HeroSlider";
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
    { categories, featured, featuredHref, newArrivals, promos, seasonal, ingredientTiles },
    banners,
    brands,
    { giftSets, builderActive },
  ] = await Promise.all([getHomepageData(), getHomeBanners(), getBrands(), getHomeGiftSets()]);

  // Bands alternate plain/mint; spacing is tight inside a group (H1 → first row,
  // promos → gift band) and generous between groups
  return (
    <>
      <HeroSlider banners={banners} />
      <HomeBand className="pt-6 pb-6 md:pt-10 md:pb-8">
        <HomeIntro categories={categories} />
      </HomeBand>
      <HomeBand className="pb-10 md:pb-16">
        <BestsellerRow
          id="featured-h"
          products={featured}
          title="Polecane produkty"
          href={featuredHref}
          priority
        />
      </HomeBand>
      <HomeBand tone="mint" className="py-10 md:py-16">
        <FadeInView>
          <SeasonalShelf
            title={SEASONAL_SHELF.title}
            categories={seasonal.categories}
            products={seasonal.products}
          />
        </FadeInView>
      </HomeBand>
      {promos.length > 0 && (
        <HomeBand className="pt-10 pb-6 md:pt-14 md:pb-8">
          <FadeInView>
            <HomePromos products={promos} />
          </FadeInView>
        </HomeBand>
      )}
      <HomeBand className={promos.length > 0 ? "pb-10 md:pb-14" : "py-10 md:py-14"}>
        <FadeInView>
          <HomeGiftSets giftSets={giftSets} builderActive={builderActive} />
        </FadeInView>
      </HomeBand>
      <HomeBand tone="mint" className="py-10 md:py-14">
        <FadeInView>
          <IngredientTiles tiles={ingredientTiles} />
        </FadeInView>
      </HomeBand>
      <HomeBand className="py-10 md:py-14">
        <FadeInView>
          <HomeNewArrivals products={newArrivals} />
        </FadeInView>
      </HomeBand>
      <HomeBand tone="mint" className="py-10 md:py-14">
        <FadeInView>
          <BrandStrip brands={brands} />
        </FadeInView>
      </HomeBand>
      <HomeBand className="py-10 md:py-14">
        <FadeInView>
          <GuidesRow categories={categories} />
        </FadeInView>
      </HomeBand>
      <HomeBand tone="mint" className="py-10 md:py-16">
        <FadeInView>
          <HomeAbout />
        </FadeInView>
      </HomeBand>
      <HomeBand className="py-10 md:py-14">
        <FadeInView>
          <WhyUs />
        </FadeInView>
      </HomeBand>
      <HideIfSubscribed>
        <HomeBand className="pb-10 md:pb-14">
          <FadeInView>
            <NewsletterSection />
          </FadeInView>
        </HomeBand>
      </HideIfSubscribed>
    </>
  );
}
