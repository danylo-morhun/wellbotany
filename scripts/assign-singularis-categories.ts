#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

const categoryMap: Record<string, string> = {
  "witamina": "witaminy-i-mineraly",
  "vitamin": "witaminy-i-mineraly",
  "kolagen": "kolagen",
  "omega": "kwasy-omega",
  "tran": "kwasy-omega",
  "probiotyk": "na-jelita",
  "probiotic": "na-jelita",
  "multiwitamina": "witaminy-i-mineraly",
  "multi": "witaminy-i-mineraly",
  "stawy": "na-stawy",
  "kollagen": "kolagen",
  "msm": "na-stawy",
  "arginin": "aminokwasy",
  "bcaa": "aminokwasy",
  "glutamin": "aminokwasy",
  "glukozamina": "na-stawy",
  "trawienie": "na-jelita",
  "digestive": "na-jelita",
  "pamięć": "na-pamiec-i-koncentracje",
  "memory": "na-pamiec-i-koncentracje",
  "stress": "na-sen",
  "sen": "na-sen",
  "sleep": "na-sen",
  "relaks": "na-sen",
  "energia": "na-zmeczenie-i-brak-energii",
  "energy": "na-zmeczenie-i-brak-energii",
  "guardana": "na-zmeczenie-i-brak-energii",
  "kofeina": "na-zmeczenie-i-brak-energii",
  "imunitet": "na-odpornosc-i-wzmocnienie",
  "immune": "na-odpornosc-i-wzmocnienie",
  "andrographis": "na-odpornosc-i-wzmocnienie",
  "żurawina": "na-odpornosc-i-wzmocnienie",
  "skóra": "na-skore",
  "skin": "na-skore",
  "dermo": "na-skore",
  "włosy": "na-wlosy",
  "hair": "na-wlosy",
  "uroda": "uroda-i-skora",
  "beauty": "uroda-i-skora",
  "oczy": "na-wzrok",
  "vision": "na-wzrok",
  "serce": "na-wzmocnienie-serca",
  "heart": "serce-i-krazenie",
  "przepływ": "serce-i-krazienie",
  "ciśnienie": "serce-i-krazienie",
  "wątroba": "na-watrobe",
  "liver": "na-watrobe",
  "detox": "detoks-i-oczyszczanie",
  "czyszczenie": "detoks-i-oczyszczanie",
  "kości": "na-kosci",
  "bone": "na-kosci",
  "magnez": "magnez",
  "magnesium": "magnez",
  "jod": "na-tarczyce",
  "thyroid": "na-tarczyce",
  "żelazo": "uzupelnienie-zelaza",
  "iron": "uzupelnienie-zelaza",
  "cynk": "witaminy-i-mineraly",
  "zinc": "witaminy-i-mineraly",
  "alga": "monopreparaty-suplementy-roslinne",
  "spirulina": "monopreparaty-suplementy-roslinne",
  "chlorella": "monopreparaty-suplementy-roslinne",
  "olej": "kwasy-omega",
  "oil": "kwasy-omega",
  "menopauza": "na-menopauze",
  "menopause": "na-menopauze",
  "kobiet": "dla-kobiet",
  "women": "dla-kobiet",
  "mama": "dla-kobiet-w-ciazy",
  "pregnancy": "dla-kobiet-w-ciazy",
  "cukier": "na-obnizenie-cukru",
  "sugar": "na-obnizenie-cukru",
};

async function assignCategories() {
  console.log("📂 Przypisywanie kategorii Singularis...\n");

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true }
  });

  const categoryBySlug = new Map(categories.map(c => [c.slug, c.id]));

  console.log(`Available categories: ${categories.length}`);
  if (categories.length === 0) {
    console.log("❌ No categories in database. Create categories first.");
    return;
  }

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, categoryId: true }
  });

  let assigned = 0;
  const alreadyHave = products.filter(p => p.categoryId).length;

  for (const product of products) {
    if (product.categoryId) continue; // skip if already has category

    const nameLower = product.namePl.toLowerCase();

    let categoryId: string | undefined;
    for (const [keyword, slug] of Object.entries(categoryMap)) {
      if (nameLower.includes(keyword.toLowerCase())) {
        categoryId = categoryBySlug.get(slug);
        if (categoryId) break;
      }
    }

    if (!categoryId) {
      categoryId = categoryBySlug.get("suplementy-diety"); // fallback
    }

    if (categoryId) {
      await prisma.product.update({
        where: { id: product.id },
        data: { categoryId }
      });
      assigned++;
    }
  }

  console.log(`Already had: ${alreadyHave}`);
  console.log(`✅ Przypisano: ${assigned}/${products.filter(p => !p.categoryId).length}`);
}

assignCategories().catch(console.error).finally(() => process.exit(0));
