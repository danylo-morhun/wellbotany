import type { Metadata } from "next";
import { BestsellerRow } from "@/app/(shop)/components/BestsellerRow";
import { CategoryGrid } from "@/app/(shop)/components/CategoryGrid";
import { FadeInView } from "@/app/(shop)/components/FadeInView";
import { HeroSection } from "@/app/(shop)/components/HeroSection";
import { NewsletterSection } from "@/app/(shop)/components/NewsletterSection";
import { TrustStrip } from "@/app/(shop)/components/TrustStrip";
import { getHomepageData } from "@/features/catalog/lib/homepage";

export const metadata: Metadata = {
  title: { absolute: "Suplementy diety, witaminy i zioła – sklep Well Botany" },
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const { categories, featured, newArrivals, promos, heroProduct } = await getHomepageData();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-12 md:space-y-16">
        <HeroSection product={heroProduct} />
        <FadeInView>
          <TrustStrip />
        </FadeInView>
        <FadeInView>
          <CategoryGrid categories={categories} />
        </FadeInView>
        <FadeInView>
          <BestsellerRow products={featured} title="Polecane produkty" href="/katalog?polecane=1" />
        </FadeInView>
        <FadeInView>
          <BestsellerRow
            products={promos}
            title="Promocje"
            href="/katalog?promocje=1"
            variant="scroll"
          />
        </FadeInView>
        <FadeInView>
          <BestsellerRow
            products={newArrivals}
            title="Nowości"
            href="/katalog?nowosci=1"
            variant="scroll"
          />
        </FadeInView>
        <FadeInView>
          <NewsletterSection />
        </FadeInView>
      </div>
    </div>
  );
}
