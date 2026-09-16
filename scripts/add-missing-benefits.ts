import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Manually curated benefits for supplements without them
const BENEFITS_MAP: Record<string, string[]> = {
  "jod-selen-probio": [
    "Jod wspiera funkcjonowanie tarczycy i metabolizm",
    "Selen wspomaga układ odpornościowy i funkcjonowanie tarczycy",
    "Bakterie probiotyczne wspomagają florę jelitową",
    "Kompleks dla zdrowia endokrynologicznego"
  ],
  "jod-dr-jacob-s": [
    "Jod wspiera prawidłowe funkcjonowanie tarczycy",
    "Wspomaga metabolizm i produkcję energii",
    "Iodynol — forma jodu o wysokiej biodostępności"
  ],
  "aminobase": [
    "Na bazie amarantusa — kompletny profil aminokwasów",
    "Białko roślinne, błonnik i minerały zasadowe",
    "Wspomaga równowagę kwasowo-zasadową",
    "Naturalne minerały do odkwaszania organizmu"
  ],
  "fizjobalans": [
    "Produkt odkwaszająco-remineralizujący",
    "Wspiera zdrowie stawów i kości",
    "Smaczny napój o smaku owocowo-jagodowym",
    "Szczególnie dla osób aktywnych fizycznie i po 50-tce"
  ],
  "granamore": [
    "Syrop z granatów dojrzałych w słońcu",
    "Z dzikiej róży — naturalna witamina C",
    "Czysty sok i miąższ z fermentacją",
    "Uniwersalny dla całej rodziny"
  ],
  "granaprostan-ferment-100-kaps": [
    "Granat fermentowany - wyższa dostępność składników",
    "Wspiera zdrowie prostaty",
    "Silny antyoksydant z granatu",
    "Tradycyjnie stosowany dla zdrowia mężczyzn"
  ],
  "kawa-chi-cafe-balans-1-kg": [
    "Bio kawa z ziołami adaptogennymi",
    "Zrównoważony smak kawowo-ziołowy",
    "Bez kofeiny — perfect na każdą porę dnia",
    "Rozpuszczalna, do użytku natychmiastowego"
  ],
  "kawa-chi-cafe-classic-400g": [
    "Bio kawa rozpuszczalna z adaptogenami",
    "Łagodny, przyjemny smak",
    "Bez tradycyjnej kofeiny",
    "Naturalne zioła dla równowagi"
  ],
  "kawa-chi-cafe-bio-400g": [
    "Bio kawa z naturalnym asortymentem",
    "Rozpuszczalna forma dla wygody",
    "Zdrowy zamiennik tradycyjnej kawy",
    "Dostępna w dwóch smakach"
  ],
  "dha-epa": [
    "Olej z mikroalg Schizochytrium — wegańskie DHA-EPA",
    "Wspiera funkcjonowanie mózgu i serca",
    "Omega-3 kwasy tłuszczowe nienasycone",
    "100% weganskie źródło bez ryb"
  ],
  "eliksir-z-granatow-500ml": [
    "Koncentrat soku i miąższu z granatów",
    "Żywa fermentacja z bakteriami probiotycznymi",
    "Bogatem w polifenole i antyoksydanty",
    "Do bezpośredniego spożycia lub rozpuszczenia"
  ],
  "gaba-probio": [
    "GABA i L-glicyna wspierają nerwy i psychikę",
    "Bakterie probiotyczne dla 'mózgu jelitowego'",
    "Wspomagają sprawność poznawczą",
    "Dla zdrowia emocjonalnego i poczucia spokoju"
  ],
  "melisabalans-tabletki": [
    "Melissa (melisa) wspiera spokój i relaks",
    "Minerały zasadowe dla równowagi",
    "Wspomagają naturalny spokój",
    "Forma tabletek do wygodnego stosowania"
  ],
  "magnez-potas-wapn-cytryniany-tabletki": [
    "Kompleks trzech mineralów w formie cytrynianu",
    "Wspiera funkcjonowanie mięśni i nerek",
    "Cytryniany — wysoka biodostępność",
    "Forma tabletek do łatwego stosowania"
  ],
  "regenerat-imun": [
    "Kompleks składników dla systemu odpornościowego",
    "Ekstrakty roślinne i minerały",
    "Wspomagają naturalne procesy obronne",
    "Szczególnie w sezonie zmian pogody"
  ],
  "siła-mężczyzny": [
    "Formacja dla zdrowia mężczyzny",
    "Wspiera witalność i energię",
    "Naturalne składniki wegańskie",
    "Hollistyczne podejście do zdrowia mężczyzny"
  ],
  "dobry-sen": [
    "Naturalne składniki wspierające sen",
    "Melatonina, magnes i zioła uspokajające",
    "Wspomaga naturalny rytm snu",
    "Bez uzależniających substancji"
  ],
  "kwercetyna-liposomalna": [
    "Kwercetyna w innowacyjnej formie liposomalne",
    "Wysoka biodostępność — do komórek",
    "Silny antyoksydant z kwercetyny",
    "Wspiera układ odpornościowy"
  ],
};

async function addBenefits() {
  console.log("Adding benefits to products...\n");

  let added = 0;
  let skipped = 0;

  for (const [slug, benefits] of Object.entries(BENEFITS_MAP)) {
    try {
      const product = await prisma.product.findUnique({
        where: { slug }
      });

      if (!product) {
        console.log(`⚠ Not found: ${slug}`);
        skipped++;
        continue;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: { benefitsPl: benefits }
      });

      console.log(`✓ ${product.namePl}`);
      added++;
    } catch (err) {
      console.error(`✗ ${slug}: ${err}`);
    }
  }

  console.log(`\n✓ Added benefits: ${added}`);
  console.log(`⚠ Skipped: ${skipped}`);

  await prisma.$disconnect();
}

addBenefits().catch(console.error);
