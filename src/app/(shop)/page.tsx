import type { Metadata } from "next";
import { BestsellerRow } from "@/app/(shop)/components/BestsellerRow";
import { BrandStrip } from "@/app/(shop)/components/BrandStrip";
import { FadeInView } from "@/app/(shop)/components/FadeInView";
import { GuidesRow } from "@/app/(shop)/components/GuidesRow";
import { HomeAbout } from "@/app/(shop)/components/HomeAbout";
import { HomeIntro } from "@/app/(shop)/components/HomeIntro";
import { IngredientTiles } from "@/app/(shop)/components/IngredientTiles";
import { NewsletterSection } from "@/app/(shop)/components/NewsletterSection";
import { SeasonalShelf } from "@/app/(shop)/components/SeasonalShelf";
import { WhyUs } from "@/app/(shop)/components/WhyUs";
import { getBrands } from "@/features/catalog/actions";
import { getHomepageData, SEASONAL_SHELF } from "@/features/catalog/lib/homepage";
import { HeroSlider } from "@/features/home/components/HeroSlider";
import { getHomeBanners } from "@/features/home/lib/banners";

export const metadata: Metadata = {
  title: { absolute: "Suplementy diety, witaminy i zioła – sklep Well Botany" },
  alternates: { canonical: "/" },
};

// Banners open/close on their dates without an admin edit
export const revalidate = 3600;

export default async function HomePage() {
  const [
    { categories, featured, featuredHref, newArrivals, promos, seasonalTabs, ingredientTiles },
    banners,
    brands,
  ] = await Promise.all([getHomepageData(), getHomeBanners(), getBrands()]);

  return (
    <>
      <HeroSlider banners={banners} />
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="space-y-12 md:space-y-16">
          <div className="space-y-8 md:space-y-10">
            {/* Products right under the hero so the first screen sells; the H1 and
                need shortcuts follow */}
            <BestsellerRow
              id="featured-h"
              products={featured}
              title="Polecane produkty"
              href={featuredHref}
            />
            <HomeIntro categories={categories} />
          </div>
          <FadeInView>
            <SeasonalShelf title={SEASONAL_SHELF.title} tabs={seasonalTabs} />
          </FadeInView>
          <FadeInView>
            <BestsellerRow
              id="promos-h"
              products={promos}
              title="Promocje"
              href="/katalog?promocje=1"
              variant="scroll"
            />
          </FadeInView>
          <FadeInView>
            <IngredientTiles tiles={ingredientTiles} />
          </FadeInView>
          <FadeInView>
            <BestsellerRow
              id="new-h"
              products={newArrivals}
              title="Nowości"
              href="/katalog?nowosci=1"
              variant="scroll"
            />
          </FadeInView>
          <FadeInView>
            <BrandStrip brands={brands} />
          </FadeInView>
          <FadeInView>
            <GuidesRow categories={categories} />
          </FadeInView>
          <FadeInView>
            <HomeAbout />
          </FadeInView>
          <FadeInView>
            <WhyUs />
          </FadeInView>
          <FadeInView>
            <NewsletterSection />
          </FadeInView>
        </div>
      </div>
    </>
  );
}
