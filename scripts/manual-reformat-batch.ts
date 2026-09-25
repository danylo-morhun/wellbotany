import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Manually crafted descriptions — facts preserved, text reorganized beautifully
const MANUAL_REFORMATS: Record<
  string,
  {
    shortDescPl: string;
    descriptionPl: string;
    benefitsPl?: string[];
  }
> = {
  // Dr. Jacob's — top products
  ahista: {
    shortDescPl:
      "Starannie dobrana mieszanka składników dla zdrowia jelit, trawienia i osób z wrażliwością na histaminę.",
    descriptionPl: `<p><strong>Ahista</strong> to kompleksowy suplement wspierający zdrowie przewodu pokarmowego i funkcjonowanie błony śluzowej jelit.</p>
<h3>Co wyróżnia ten produkt?</h3>
<ul>
<li>Mikronizowana, diatomitowa ziemia okrzemkowa z naturalnymi właściwościami wiążącymi toksyny</li>
<li>Bogata w naturalny wapń z alg o wysokiej biodostępności</li>
<li>Ekstrakt z kadzidłowca (boswellia), perełkowca japońskiego i kwercetynę</li>
<li>Witamina B6 i miedź wspierające rozkład histaminy (tworzenie diaminooksydazy — DAO)</li>
<li>100% wegański, bez glutenu</li>
</ul>
<h3>Jak działa produkt?</h3>
<p>Błona śluzowa jelit to największa błona śluzowa organizmu — jej stan ma ogromne znaczenie dla zdrowia trawienia, wchłaniania pokarmu i funkcjonowania układu odpornościowego. Ahista zawiera kombinację składników wspierających jej regenerację i ochronę, szczególnie ważną dla osób z wrażliwością na histaminę.</p>
<p>Diatomyt pochłania toksyny, magnez i wapń wspierają prawidłowe funkcjonowanie enzymów trawiennych, a naturalne ekstrakty wspomagają redukcję stanów zapalnych.</p>`,
    benefitsPl: [
      "Mikronizowana ziemia okrzemkowa z właściwościami wiążącymi toksyny",
      "Wapń z alg i magnez dla zdrowia jelit",
      "Ekstrakt z kadzidłowca i perełkowca japońskiego",
      "Witamina B6 i miedź wspierające rozkład histaminy",
      "100% wegański, bez glutenu",
    ],
  },

  "aloevera-dr-jacob-s": {
    shortDescPl:
      "Orzeźwiający sok z żelu Aloe vera z upraw ekologicznych, pasteryzowany na zimno z naturalną witaminą C z aceroli.",
    descriptionPl: `<p><strong>AloeVera Dr. Jacob's</strong> to naturalny napój z czystego żelu aloesu z upraw ekologicznych w Andaluzji, pasteryzowany metodą zimną, która zachowuje wszystkie bioaktywne składniki.</p>
<h3>Co wyróżnia ten produkt?</h3>
<ul>
<li>Ze świeżych liści aloesu zbieranych ręcznie w jakości surowej żywności</li>
<li>Pasteryzacja na zimno zachowuje wszystkie składniki aktywne</li>
<li>Z upraw ekologicznych w Andaluzji — zbiór po 3 latach wzrostu rośliny</li>
<li>Wzbogacony naturalną witaminą C z wiśni Aceroli</li>
<li>Bez cukru, konserwantów i sztucznych dodatków</li>
</ul>
<h3>Jak działa produkt?</h3>
<p>Sok z żelu Aloe vera wspomaga naturalne procesy w organizmie dzięki bogatej zawartości polisacharydów i bioaktywnych substancji. Naturalna witamina C wspiera syntezę kolagenu, pracę układu odpornościowego i zdrowotne funkcje skóry.</p>`,
    benefitsPl: [
      "Ze świeżych liści aloesu w jakości surowej żywności",
      "Pasteryzacja na zimno zachowuje bioaktywne składniki",
      "Z upraw ekologicznych Andaluzji",
      "Naturalna witamina C z Aceroli",
      "Bez cukru i konserwantów",
    ],
  },

  "kurkumina-liposomalna": {
    shortDescPl:
      "Kurkumina w innowacyjnej formie liposomalne — najwyższa biodostępność dzięki systemowi absorpcji komórkowej.",
    descriptionPl: `<p><strong>Kurkumina liposomalna</strong> to zaawansowana forma kurkuminy zawarta w liposomach — małych vezikułach, które drastycznie zwiększają wchłanianie aktywnego składnika w organizmie.</p>
<h3>Co wyróżnia ten produkt?</h3>
<ul>
<li>Innowacyjna technologia liposomalna zwiększająca biodostępność kurkuminy do 10 razy</li>
<li>Wysoka standaryzacja zawartości kurkuminoidów</li>
<li>Bezpośrednia absorpcja na poziomie komórek</li>
<li>Potencjał antyoksydacyjny i wspomagający naturalny proces zapalny</li>
<li>Wegańska formuła, bez GMO</li>
</ul>
<h3>Jak działa produkt?</h3>
<p>Tradycyjna kurkumina ma słabą biodostępność w przewodzie pokarmowym. Format liposomski rozwiązuje ten problem — lipidy chroniące kurkuminę pozwalają jej dotrzeć bez rozkładu do jelit i być wchłoniętej bezpośrednio na poziomie komórkowym, gdzie wykonuje swoją pracę.</p>`,
    benefitsPl: [
      "Liposomalna forma — do 10x wyższa biodostępność",
      "Wysoka standaryzacja kurkuminoidów",
      "Potent antyoksydant i wsparcie procesów zapalnych",
      "Absorpcja na poziomie komórkowym",
      "Wegański, bez GMO",
    ],
  },
};

async function applyManualReformats() {
  console.log("Applying manual reformats...");

  let applied = 0;
  let skipped = 0;

  for (const [slug, data] of Object.entries(MANUAL_REFORMATS)) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, namePl: true },
    });

    if (!product) {
      console.log(`⚠ Not found: ${slug}`);
      skipped++;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        shortDescPl: data.shortDescPl,
        descriptionPl: data.descriptionPl,
        benefitsPl: data.benefitsPl ? data.benefitsPl : undefined,
      },
    });

    console.log(`✓ ${product.namePl}`);
    applied++;
  }

  console.log(`\nApplied: ${applied}, Skipped: ${skipped}\n`);

  // Save mapping for reference
  await fs.writeFile(
    "/tmp/reformatted-count.txt",
    `Applied: ${applied}\nRemaining: ${167 - applied}\n`,
  );

  await prisma.$disconnect();
}

applyManualReformats().catch(console.error);
