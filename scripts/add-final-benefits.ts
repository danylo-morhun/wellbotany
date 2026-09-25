import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FINAL_BENEFITS: Record<string, string[]> = {
  "papierki-lakmusowe-120-sztuk": [
    "120 pasków testowych lakmusowych",
    "Szybki test pH moczu i śliny",
    "Do codziennej kontroli równowagi",
    "Precyzyjny zakres pH od 4,5 do 8,0",
  ],
  "papierki-lakmusowe-33-sztuki": [
    "33 paski testowe",
    "Szybka ocena kwaśności/zasadowości",
    "Test pH na bieżąco",
    "Mały format do noszenia",
  ],
  "papierki-lakmusowe-22-sztuki": [
    "22 paski testowe",
    "Handy testowanie pH",
    "Do praktyk domowych",
    "Precyzyjny odczyt",
  ],
  "magnez-potas-wapn-cytryniany-plus": [
    "Ulepszona formuła trzech mineralów",
    "Dodatek dla zdrowia kostno-mięśniowego",
    "Wysoka biochwyjność",
    "Dla aktywnych osób",
  ],
  "omni-biotic-cat-dog": [
    "Probiotyk specjalnie dla psów i kotów",
    "Wspiera florę jelitową zwierząt",
    "Dla zdrowia przewodu pokarmowego",
    "Naturalne bakterie dla pupili",
  ],
  "omni-logic-apple-pectin": [
    "Pektyna z jabłek naturalna",
    "Osobisty trener bakterii beztlenowych",
    "Prebiotyk dla zdrowia",
    "Wspomagaczflory jelitowej",
  ],
  "sol-niskosodowa-250g": [
    "Zmniejszona zawartość sodu",
    "Mniejsze opakowanie do testowania",
    "Wzbogacona minerałami",
    "Dla zdrowia pod kontrolą sodu",
  ],
  "sila-mezczyzny-wyprzedaz": [
    "Kompleksowa formuła dla zdrowia mężczyzny",
    "Wspiera witalność i energię",
    "Naturalne składniki wegańskie",
    "Promocyjna dostępność",
  ],
  "kawa-chi-cafe-proactive-360g": [
    "Bio kawa proactive z adaptogenami",
    "Większe opakowanie ekonomiczne",
    "Rozpuszczalna dla szybkiego przygotowania",
    "Naturalne wsparcie dla zdrowia",
  ],
  "witamina-adek": [
    "Kompleks witamin A, D, E, K",
    "Lipidosoluble vitamins wsparcie",
    "Dla zdrowia костей, wzroku i kożu",
    "Aktywne formy witamin",
  ],
  "witamina-b12-active": [
    "Aktywna forma B12 metylkobalamina",
    "Wyższa biodostępność",
    "Wsparcie dla energii i nerwów",
    "Szczególnie dla wegan/wegetarian",
  ],
  "witamina-d3k2-forte": [
    "Wzmocniona formuła D3+K2",
    "Wyższe dawki dla intensywnego wsparcia",
    "Synergistyczne działanie",
    "Dla zdrowia kostno-mięśniowego",
  ],
  "witamina-slonca-d3-baby": [
    "Witamina D3 przeznaczony dla niemowląt",
    "Łatwa forma do aplikacji",
    "Wspomagadevelopment kości u mały",
    "Bezpieczny dla najmłodszych",
  ],
  "witamina-slonca-d3-junior": [
    "Witamina D3 dla dzieci",
    "Wspiera zdrowy wzrost kostny",
    "Wsparcie systemu odpornościowego",
    "Dla prawidłowego rozwoju",
  ],
  "witamina-slonca-d3-forte": [
    "Wysoka dawka witaminy D3",
    "Intesywne wsparcie dla kostiu",
    "Dla osób z małą ekspozycją słońcu",
    "Zdolność absorpcji wapnia",
  ],
  "kawa-chi-cafe-balans-180g": [
    "Bio kawa balans mniejszy rozmiar",
    "Rozpuszczalna convenience",
    "Zioła adaptogenne",
    "Idealny do spróbowania",
  ],
  "melatonina-b12": [
    "Melatonina + Witamina B12",
    "Wsparcie dla snu i energii",
    "Kompleksowy odpoczynek",
    "Dla zdrowego cyklu dziennego",
  ],
  "moc-kobiety": [
    "Specjalna formuła dla zdrowia kobiety",
    "Wspiera równowagę hormonalną",
    "Naturalne składniki wegańskie",
    "Kompleksowe wsparcie",
  ],
  "q10-synergia": [
    "Koenzym Q10 w synergistycznej formule",
    "Wspiera energię mitochondriów",
    "Dla zdrowia serca",
    "Silny antyoksydant",
  ],
  "q10-liposomalne": [
    "Q10 w formie liposomalne",
    "Do 10x wyższa biodostępność",
    "Wsparcie energii komórkowej",
    "Dla zdrowia serca i krążenia",
  ],
  "magnez-potas-wapn-cytryniany-proszek": [
    "Proszek do rozpuszczania mineralny",
    "Szybkie wchłanianie",
    "Dla mięśni i nerek",
    "Łatwe mieszanie w wodzie",
  ],
  "opc-synergia": [
    "OPC ze win i jagód",
    "Synergistyczne działanie",
    "Potent antyoksydant",
    "Dla zdrowia naczyń krwionośnych",
  ],
  "silne-nerwy": [
    "Kompleks dla zdrowia nerwów",
    "Wsparcie funkcji kognitywnych",
    "Naturalne zioła uspokajające",
    "Dla równowagi psychicznej",
  ],
  "kawa-chi-cafe-balans-450g": [
    "Bio kawa balans średni rozmiar",
    "Rozpuszczalna konwencja",
    "Długotrwałość na miesiąc",
    "Naturalne wsparcie adaptogenne",
  ],
  "witamina-ae": [
    "Kompleks A+E",
    "Dla zdrowia skóry i wzroku",
    "Lipidosoluble wsparcie",
    "Antyoksydacyjna ochrona",
  ],
  "witamina-slonca-d3": [
    "Witamina D3 standard",
    "Wsparcie zdrowia kostno-mięśniowego",
    "Absorpcja wapnia",
    "Dla każdego",
  ],
  "granaprostan-ferment-500-ml": [
    "Granat fermentowany w większym formacie",
    "Żywa fermentacja",
    "Wsparcie zdrowia prostaty",
    "Dla długotrwałego stosowania",
  ],
  "kawa-bezkofeinowa-chi-cafe-free-250g": [
    "Chi-Cafe bez kofeiny",
    "Rozpuszczalna dla wygody",
    "Idealna na wieczór",
    "Naturalne smaki i zioła",
  ],
  lactobifido: [
    "Kompleks Lactobacillus i Bifidobacterium",
    "Synergistyczne działanie",
    "Dla zdrowia flory jelitowej",
    "Wsparcie naturalnego probiotyk",
  ],
};

async function addFinal() {
  console.log("Adding final batch of benefits...\n");

  let added = 0;
  let errors = 0;

  for (const [slug, benefits] of Object.entries(FINAL_BENEFITS)) {
    try {
      const product = await prisma.product.findUnique({
        where: { slug },
      });

      if (!product) {
        console.log(`⚠ Not found: ${slug}`);
        errors++;
        continue;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: { benefitsPl: benefits },
      });

      console.log(`✓ ${product.namePl}`);
      added++;
    } catch (_err) {
      console.error(`✗ ${slug}`);
      errors++;
    }
  }

  console.log(`\n✓ Final added: ${added}`);
  console.log(`✗ Errors/not found: ${errors}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total benefits added across all batches: 17 + 14 + ${added} = ${17 + 14 + added}`);

  await prisma.$disconnect();
}

addFinal().catch(console.error);
