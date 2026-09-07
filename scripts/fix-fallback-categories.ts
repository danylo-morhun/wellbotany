#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

// Additional targeted mappings for products that fell into generic "suplementy-diety"
const extraMap: Record<string, string> = {
  kurkumin: "na-jelita",
  curcumin: "na-jelita",
  kurkuma: "na-jelita",
  odchudzanie: "na-spalanie-tluszczu",
  revolut: "na-spalanie-tluszczu",
  spalanie: "na-spalanie-tluszczu",
  apetyt: "na-zmniejszenie-apetytu",
  morwa: "na-obnizenie-cukru",
  fasolamina: "na-spalanie-tluszczu",
  gryka: "serce-i-krazenie",
  rutyna: "serce-i-krazenie",
  cholesterol: "na-cholesterol",
  koenzym: "na-wzmocnienie-serca",
  q10: "na-wzmocnienie-serca",
  berberyna: "na-obnizenie-cukru",
  cukier: "na-obnizenie-cukru",
  prostata: "dla-mezczyzn",
  libido: "na-libido",
  potencja: "na-libido",
  testosteron: "dla-mezczyzn",
  mama: "dla-kobiet-w-ciazy",
  ciąż: "dla-kobiet-w-ciazy",
  płodność: "na-plodnosc",
  katar: "uklad-oddechowy",
  przeziębienie: "uklad-oddechowy",
  androgra: "uklad-oddechowy",
  alergi: "na-alergie",
  wątrob: "na-watrobe",
  detox: "detoks-i-oczyszczanie",
  oczyszcz: "detoks-i-oczyszczanie",
  woda: "usuwanie-nadmiaru-wody",
  obrzęk: "usuwanie-nadmiaru-wody",
  limfa: "uklad-limfatyczny",
  pęcherz: "uklad-moczowy",
  moczow: "uklad-moczowy",
  nerki: "uklad-moczowy",
  sport: "sport",
  bcaa: "aminokwasy",
  kreatyna: "sport",
  psycho: "na-jelita",
  intima: "dla-kobiet",
  probiotic: "na-jelita",
  shield: "na-odpornosc-i-wzmocnienie",
  grzyb: "grzyby-witalne",
  reishi: "grzyby-witalne",
  chaga: "grzyby-witalne",
  cordyceps: "grzyby-witalne",
  lubrisyn: "na-stawy",
  kwas: "na-stawy",
  hialuronow: "na-stawy",
  msm: "na-stawy",
  glukozamin: "na-stawy",
  chondroityn: "na-stawy",
  boswellin: "na-stawy",
  żelki: "witaminy-i-mineraly",
  mniamki: "witaminy-i-mineraly",
  ashwagandha: "adaptogeny",
  rhodiola: "adaptogeny",
  różeniec: "adaptogeny",
  bacopa: "na-pamiec-i-koncentracje",
  ginko: "na-pamiec-i-koncentracje",
  miłorząb: "na-pamiec-i-koncentracje",
  memoria: "na-pamiec-i-koncentracje",
  koncentrac: "na-pamiec-i-koncentracje",
  resweratrol: "antyoksydanty",
  koenzymq: "antyoksydanty",
  antyoksydant: "antyoksydanty",
  kwercytyna: "antyoksydanty",
  "młody jęczmień": "detoks-i-oczyszczanie",
  chlorella: "detoks-i-oczyszczanie",
  jod: "na-tarczyce",
  tarczyc: "na-tarczyce",
  maślan: "na-jelita",
  colostrum: "na-odpornosc-i-wzmocnienie",
  acerola: "na-odpornosc-i-wzmocnienie",
  guarana: "na-zmeczenie-i-brak-energii",
  burak: "na-poprawe-krazenia",
  sabeet: "na-poprawe-krazenia",
  miedź: "witaminy-i-mineraly",
  "palma sabał": "dla-mezczyzn",
  folian: "dla-kobiet-w-ciazy",
  lukrecja: "uklad-oddechowy",
  maca: "dla-mezczyzn",
  "enzymy trawi": "na-trawienie-i-wzdecia",
  digezyme: "na-trawienie-i-wzdecia",
  garcinia: "na-spalanie-tluszczu",
  selen: "na-tarczyce",
  lizyna: "aminokwasy",
  cholesteron: "na-cholesterol",
  wzrok: "na-wzrok",
  błonnik: "na-trawienie-i-wzdecia",
  biotyna: "na-wlosy",
  diosmina: "na-poprawe-krazenia",
  "odporność kompleks": "na-odpornosc-i-wzmocnienie",
  probio: "na-jelita",
  "pikolinian chromu": "na-obnizenie-cukru",
  zaparcia: "na-trawienie-i-wzdecia",
  wiesiołek: "na-menopauze",
  gravidia: "dla-kobiet-w-ciazy",
  "żeń-szeń": "na-zmeczenie-i-brak-energii",
  melatonina: "na-sen",
  immunki: "na-odpornosc-i-wzmocnienie",
  głóg: "na-wzmocnienie-serca",
  imbir: "na-trawienie-i-wzdecia",
  echinacea: "na-odpornosc-i-wzmocnienie",
  potas: "serce-i-krazenie",
};

async function main() {
  console.log("🔧 Fixing fallback categories with better keyword matching...\n");

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const fallbackCatId = categoryBySlug.get("suplementy-diety");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" }, categoryId: fallbackCatId },
    select: { id: true, namePl: true },
  });

  console.log(`Products in generic fallback: ${products.length}\n`);

  let reassigned = 0;

  for (const p of products) {
    const nameLower = p.namePl.toLowerCase();

    for (const [keyword, slug] of Object.entries(extraMap)) {
      if (nameLower.includes(keyword)) {
        const categoryId = categoryBySlug.get(slug);
        if (categoryId) {
          await prisma.product.update({
            where: { id: p.id },
            data: { categoryId },
          });
          reassigned++;
          break;
        }
      }
    }
  }

  console.log(`✅ Reassigned: ${reassigned}/${products.length}`);
  console.log(`ℹ️  Still generic: ${products.length - reassigned}`);
}

main().catch(console.error).finally(() => process.exit(0));
