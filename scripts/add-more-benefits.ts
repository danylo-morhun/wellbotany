import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MORE_BENEFITS: Record<string, string[]> = {
  "sila-mezczyzny": [
    "Kompleksowa formuła dla zdrowia mężczyzny",
    "Wspiera witalność i energię",
    "Naturalne składniki wegańskie",
    "Hollistyczne podejście do męskiego zdrowia"
  ],
  "lactacholin": [
    "Kompleks bakterii Lactobacillus",
    "Wspiera florę jelitową",
    "Naturalny probiotyk",
    "Dla zdrowia przewodu pokarmowego"
  ],
  "witamina-b-complex": [
    "Pełny kompleks witamin B",
    "Wspiera energię i funkcjonowanie nerwów",
    "Aktywne formy witamin B",
    "Dla metabolizmu i witalności"
  ],
  "witamina-b12-forte-20-ml": [
    "Wysoka dawka witaminy B12",
    "Kroplowy format do szybkiego wchłaniania",
    "Wspiera energię i funkcje kognitywne",
    "Szczególnie dla wegan i wegetarian"
  ],
  "witamina-d3k2": [
    "Kompleks D3 i K2",
    "Wspiera kości i zęby",
    "Synergistyczne działanie wita min",
    "Dla zdrowia szkieletu i immunite"
  ],
  "witamina-k2": [
    "Witamina K2 (MK-7)",
    "Wspiera prawidłowe krzepnięcie krwi",
    "Zdrowotne naczynia krwionośne",
    "Naturalne źródło fermentowane"
  ],
  "zelazo-liposomalne-dr-jacob-s": [
    "Żelazo w formie liposomalne",
    "Wysoka biodostępność bez efektów ubocznych",
    "Wspiera energię i produkcję hemoglobiny",
    "Szczególnie dla kobiet"
  ],
  "witamina-c-liposomalna": [
    "Witamina C w formie liposomalne",
    "Do 10x wyższa biodostępność",
    "Wsparcie dla systemu odpornościowego",
    "Potent antyoksydant"
  ],
  "diosmina-opc-provenis": [
    "Diosmina dla zdrowia naczyń",
    "OPC z winogron — antoksydant",
    "Wsparcie dla krażenia krwi",
    "Dla żył i naczyniek"
  ],
  "herbata-chi": [
    "Naturalna herbata z ziołami",
    "Zrównoważony smak i aromat",
    "Zioła adaptogenne",
    "Dla spokoju i równowagi"
  ],
  "sól-niskosodowa-500g": [
    "Sól ze zmniejszoną zawartością sodu",
    "Wzbogacona minerałami",
    "Dla zdrowia przy restrykcji sodu",
    "Naturalne źródło minerałów"
  ],
  "steviabase": [
    "Naturalna erytrytol ze stewią",
    "Bez kalorii i czystego zapachu",
    "Idealny słodzik do napojów",
    "Zero indeks glikemiczny"
  ],
  "watroba-hepa-forte-dr-jacob-s": [
    "Kompleks dla zdrowia wątroby",
    "Ekstrakty ziołowe tradycyjne",
    "Wspiera naturalne detoksykację",
    "Dla regeneracji wątroby"
  ],
  "reichi-zen-adaptogeny-grzybowe": [
    "Grzyby adapogenne Reishi",
    "Wspiera spokój i relaksację",
    "Tradycyjne chińskie podejście",
    "Dla równowagi i poczucia spokoju"
  ],
  "ph-balans-plus-saszetka-6-g": [
    "Minerały zasadowe w formie saszetek",
    "Do rozpuszczenia w wodzie",
    "Wspiera równowagę pH",
    "Dostępna próbka do testowania"
  ],
  "lactose-free": [
    "Całkowicie wolny od laktozy",
    "Idealny dla nietolerancji",
    "Wszystkie korzyści bez dyskomfortu",
    "Dla wrażliwego przewodu pokarmowego"
  ]
};

async function addMore() {
  console.log("Adding more benefits...\n");

  let added = 0;
  let skipped = 0;

  for (const [slug, benefits] of Object.entries(MORE_BENEFITS)) {
    try {
      const product = await prisma.product.findUnique({
        where: { slug }
      });

      if (!product) {
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
      console.error(`✗ ${slug}`);
    }
  }

  console.log(`\n✓ Added: ${added}`);
  console.log(`⚠ Not found: ${skipped}`);

  await prisma.$disconnect();
}

addMore().catch(console.error);
