import type { Metadata } from "next";
import { BestsellerTabs } from "@/app/(shop)/components/BestsellerTabs";
import { BrandStrip } from "@/app/(shop)/components/BrandStrip";
import { FadeInView } from "@/app/(shop)/components/FadeInView";
import { HelpAndGuides } from "@/app/(shop)/components/HelpAndGuides";
import { HomeAbout } from "@/app/(shop)/components/HomeAbout";
import { HomeBand } from "@/app/(shop)/components/HomeBand";
import { HomeGiftSets } from "@/app/(shop)/components/HomeGiftSets";
import { HomeHeadline } from "@/app/(shop)/components/HomeHeadline";
import { HomeIntro } from "@/app/(shop)/components/HomeIntro";
import { HomeNewArrivals } from "@/app/(shop)/components/HomeNewArrivals";
import { HomePromos } from "@/app/(shop)/components/HomePromos";
import { IngredientTiles } from "@/app/(shop)/components/IngredientTiles";
import { NewsletterSection } from "@/app/(shop)/components/NewsletterSection";
import { TrustStrip } from "@/app/(shop)/components/TrustStrip";
import { getBrands } from "@/features/catalog/actions";
import { getHomepageData } from "@/features/catalog/lib/homepage";
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

const NEED_LINKS = 3;

export default async function HomePage() {
  const [
    { categories, tabs, newArrivals, promos, ingredientTiles },
    banners,
    brands,
    { giftSets, builderActive },
  ] = await Promise.all([getHomepageData(), getHomeBanners(), getBrands(), getHomeGiftSets()]);

  // Quiet need links beside the H1: the next needs after the ones that got a tab
  const tabIds = new Set(tabs.map((t) => t.id));
  const needLinks = categories
    .filter(
      (c) => c.parentId === null && c.group === "NEED" && c.productCount > 0 && !tabIds.has(c.slug),
    )
    .sort((a, b) => b.productCount - a.productCount || a.sortOrder - b.sortOrder)
    .slice(0, NEED_LINKS);

  // Bands after the opening alternate mint/plain (DESIGN.md §5)
  const rest = [
    <HomeIntro key="intro" categories={categories} headline={false} />,
    promos.length > 0 && (
      <FadeInView key="promos">
        <HomePromos products={promos} />
      </FadeInView>
    ),
    (giftSets.length > 0 || builderActive) && (
      <FadeInView key="gifts">
        <HomeGiftSets giftSets={giftSets} builderActive={builderActive} />
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
        <HomeHeadline needs={needLinks} />
        <div className="mt-4 md:mt-5">
          <BestsellerTabs tabs={tabs} lead />
        </div>
      </HomeBand>
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
