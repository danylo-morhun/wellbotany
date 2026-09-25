// SEO name pass: namePl + metaTitlePl + metaDescPl + tree categories for
// every active product, written by the local model and checked by script
// (lib/name-rules.ts). Resumable — one file per product in
// data/content-pass/names/. Nothing is written to the DB here.
//   DATABASE_URL=… npx tsx scripts/content-pass/name-pass.ts [--sample N] [--limit N] [--only id,id] [--force]
import fs from "node:fs";
import path from "node:path";
import { readNutritionFacts } from "../../src/features/products/lib/nutrition-facts";
import { connect } from "./db";
import {
  brandTokens,
  checkNameOut,
  type NameOut,
  type NameProblem,
  normalizeCase,
  primaryFromOldCategories,
} from "./lib/name-rules";
import { chatJson, TEXT_MODEL, VISION_MODEL } from "./lib/ollama";

// Second opinion on the primary category from a different model family —
// the two disagreeing is the cheapest reliable "unsure" signal
const SECOND_MODEL = process.env.CONTENT_SECOND_MODEL ?? VISION_MODEL;

const OUT_DIR = path.join(__dirname, "../../data/content-pass/names");
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const sample = Number(flag("--sample")) || 0;
const limit = Number(flag("--limit")) || 0;
const only = flag("--only")?.split(",");
const force = args.includes("--force");
// Reasoning roughly doubles category accuracy but costs ~30× the time
const think = args.includes("--think");

type TreeCategory = { slug: string; namePl: string; group: string; parentSlug: string | null };
const tree = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../data/content-pass/categories/tree.json"), "utf8"),
) as { categories: TreeCategory[] };
const bySlug = new Map(tree.categories.map((c) => [c.slug, c]));
const primarySlugs = tree.categories.filter((c) => c.group !== "AUDIENCE").map((c) => c.slug);
const extraSlugs = tree.categories.map((c) => c.slug);

// Common words that should be lower-case mid-name
const VOCABULARY = new Set(
  [
    ...tree.categories.flatMap((c) => c.namePl.toLowerCase().split(/[\s,]+/)),
    "kwas",
    "hialuronowy",
    "ekstrakt",
    "kompleks",
    "witamina",
    "witaminą",
    "magnez",
    "cynk",
    "żelazo",
    "selen",
    "kolagen",
    "proszek",
    "olej",
    "organiczny",
    "liposomalna",
    "forte",
  ].filter((w) => w.length >= 3),
);

const categoryList = ["TYPE", "NEED", "AUDIENCE", "OTHER"]
  .map(
    (group) =>
      `## ${group}\n${tree.categories
        .filter((c) => c.group === group)
        .map(
          (c) =>
            `- ${c.slug} — ${c.namePl}${c.parentSlug ? ` (podkategoria ${c.parentSlug})` : ""}`,
        )
        .join("\n")}`,
  )
  .join("\n");

const SYSTEM = `Jesteś redaktorem polskiego sklepu z suplementami diety. Dla jednego produktu zwracasz JSON: namePl, metaTitlePl, metaDescPl, primaryCategory, extraCategories. Wszystkie fakty (składniki, dawki, ilości, postać) bierzesz WYŁĄCZNIE z danych produktu. Niczego nie dopisujesz.

# namePl — nazwa produktu
Format: "{termin, którego szuka klient} {forma składnika} {dawka} – {ilość} {postać}".
- Na początku polski termin wyszukiwany przez klientów: "Magnez", "Witamina D3", "Kolagen", "Ashwagandha", "Probiotyk". Angielskie nazwy tłumacz na polski ("Vitamin B Complex" → "Witamina B Complex (kompleks witamin B)").
- Dawka przy składniku, BEZ myślnika: "Witamina C 500 mg". Myślnik " – " (półpauza ze spacjami) tylko przed opakowaniem: "– 60 kaps.".
- Nazwy handlowe i znaki ® ™ zostaw, ale dopisz co to jest: "BactoFlor Omni – probiotyk, 30 kaps." Nazwy formuł typu "Formuła Na Stawy" zostaw jako rdzeń.
- BEZ nazwy marki (marka jest pokazana osobno), bez "Suplement diety", bez "NOWOŚĆ".
- Bez WERSALIKÓW; skróty jak MSM, NAC, DHA, EPA, MK-7, D3, B12, Q10, 5-MTHF zostają. Wielka litera tylko na początku i w nazwach własnych: "Magnez z witaminą B6", nie "Magnez z Witaminą B6".
- Zachowaj grupę docelową z obecnej nazwy ("Kids", "Junior", "dla dzieci" → "dla dzieci"; "dla kobiet", "Senior").
- Nie dodawaj słów, których nie ma w danych (np. "mielony", "cały", "sproszkowany", nazwy surowców) — każde słowo nazwy musi wynikać z danych produktu.
- Nazwy handlowe przepisuj DOKŁADNIE, litera po literze.
- Jednostki: mg, µg, g, ml, IU, kaps., tabl., sasz., szt., żelek (bez skrótu "żel.").
- Opakowanie ("– 60 kaps.", "– 250 g") tylko gdy produkt ma JEDEN wariant i ilość jest w danych. Gdy ma kilka wariantów (np. 60 i 120 kaps.) — nazwa BEZ opakowania.
- Nie znasz dawki lub ilości → pomiń ją. Maks. 90 znaków.

# metaTitlePl
"{krótka nazwa z dawką} {Marka}", maks. 45 znaków. Bez "Well Botany".

# metaDescPl
120–155 znaków, rzeczowo, po polsku: co to jest, kluczowy składnik i dawka, postać/opakowanie, marka. ZAKAZ jakichkolwiek obietnic zdrowotnych i czasowników typu wspiera, wspomaga, poprawia, pomaga, chroni, wzmacnia, działa, przyczynia się. Zakończ: "Wysyłka w 24–48 h."

# Kategorie
${categoryList}

primaryCategory — CZYM jest produkt:
- suplement z jednym dominującym składnikiem → najbardziej szczegółowa kategoria TYPE (np. "magnez", nie "mineraly"; ekstrakt z jednej rośliny → "ziola-jednoskladnikowe", chyba że pasuje "adaptogeny", "kurkuma", "grzyby-funkcjonalne", "algi-i-superfoods");
- formuła wieloskładnikowa bez dominującego składnika (np. "Formuła Na Stawy", "Cholesterol W Normie", glukozamina + kurkuma + boswellia) → kategoria NEED, do której służy;
- nie-suplement (żywność, przyprawa, kosmetyk, akcesorium, książka) → kategoria OTHER.
extraCategories — 0–4 kategorie NEED/AUDIENCE (wyjątkowo jeszcze jedna TYPE), tylko gdy wynika to WPROST z nazwy, opisu lub składu. "suplementy-weganskie" tylko gdy dane mówią "wegański".

# Przykłady
{"namePl":"Magnez cytrynian 300 mg – 120 kaps.","metaTitlePl":"Magnez cytrynian 300 mg Kenay","primaryCategory":"magnez","extraCategories":["na-zmeczenie-i-energie"]}
{"namePl":"Liposomalna witamina C 500 mg – 60 kaps.","metaTitlePl":"Liposomalna witamina C 500 mg LIPOCAPS","primaryCategory":"witamina-c","extraCategories":["na-odpornosc"]}
{"namePl":"Formuła Na Stawy – kompleks ziołowy, 50 kaps.","metaTitlePl":"Formuła Na Stawy Yango","primaryCategory":"na-stawy-i-kosci","extraCategories":[]}
{"namePl":"Sumak mielony – 85 g","metaTitlePl":"Sumak mielony 85 g Yango","primaryCategory":"przyprawy-i-sol","extraCategories":[]}
{"namePl":"Kolagen typu II niedenaturowany 40 mg","metaTitlePl":"Kolagen typu II 40 mg BICAPS","primaryCategory":"kolagen","extraCategories":["na-stawy-i-kosci"]}`;

const schema = {
  type: "object",
  properties: {
    namePl: { type: "string" },
    metaTitlePl: { type: "string" },
    metaDescPl: { type: "string" },
    primaryCategory: { type: "string", enum: primarySlugs },
    extraCategories: {
      type: "array",
      items: { type: "string", enum: extraSlugs },
      maxItems: 4,
    },
  },
  required: ["namePl", "metaTitlePl", "metaDescPl", "primaryCategory", "extraCategories"],
};

async function main() {
  const prisma = connect();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", ...(only && { id: { in: only } }) },
    orderBy: { id: "asc" },
    select: {
      id: true,
      slug: true,
      namePl: true,
      metaTitlePl: true,
      metaDescPl: true,
      shortDescPl: true,
      netWeight: true,
      servingSize: true,
      servingsPerContainer: true,
      ingredients: true,
      nutritionFacts: true,
      categoryId: true,
      brand: { select: { name: true, parentBrand: { select: { name: true } } } },
      variants: { select: { optionValue: true }, where: { isActive: true } },
      categoryLinks: { select: { category: { select: { slug: true } } } },
    },
  });

  let queue = products;
  if (sample) {
    const step = Math.max(1, Math.floor(products.length / sample));
    queue = products.filter((_, i) => i % step === 0).slice(0, sample);
  }
  if (limit) queue = queue.slice(0, limit);

  let done = 0;
  let flagged = 0;
  const started = Date.now();
  for (const p of queue) {
    const file = path.join(OUT_DIR, `${p.id}.json`);
    if (!force && fs.existsSync(file)) continue;

    const oldSlugs = p.categoryLinks.map((l) => l.category.slug);
    const fixedPrimary = primaryFromOldCategories(oldSlugs);
    const variantLabels = p.variants.map((v) => v.optionValue).filter((v): v is string => !!v);
    const { rows, text } = readNutritionFacts(p.nutritionFacts);
    const ingredients =
      p.ingredients && typeof p.ingredients === "object"
        ? ((p.ingredients as { pl?: string }).pl ?? "")
        : "";
    const input = {
      obecnaNazwa: p.namePl,
      marka: p.brand?.name ?? null,
      opis: p.shortDescPl,
      masaNetto: p.netWeight,
      porcja: p.servingSize,
      porcjiWOpakowaniu: p.servingsPerContainer,
      warianty: variantLabels,
      sklad: ingredients.slice(0, 600),
      wartosciOdzywcze: rows.length
        ? rows
            .map((r) => `${r.name}: ${r.amount}`)
            .join("; ")
            .slice(0, 700)
        : (text ?? "").slice(0, 700),
      obecneKategorie: oldSlugs,
      ...(fixedPrimary && { wymaganaKategoriaGlowna: fixedPrimary }),
    };
    const sourceText = [
      p.namePl,
      p.shortDescPl,
      p.netWeight,
      p.servingSize,
      p.servingsPerContainer
        ? `${p.servingsPerContainer} kaps. ${p.servingsPerContainer} tabl. ${p.servingsPerContainer} sasz. ${p.servingsPerContainer} szt.`
        : "",
      ...variantLabels,
      ingredients,
      input.wartosciOdzywcze,
    ].join("\n");
    const ctx = {
      sourceText,
      oldName: p.namePl,
      brandTokens: brandTokens(p.brand?.name ?? null, p.brand?.parentBrand?.name ?? null),
      brandName: p.brand?.name ?? null,
      variantLabels,
      allowedPrimary: new Set(primarySlugs),
      allowedExtra: new Set(extraSlugs),
      fixedPrimary,
    };

    const t = Date.now();
    let out: NameOut | null = null;
    let problems: NameProblem[] = [];
    let attempts = 0;
    let user = JSON.stringify(input);
    while (attempts < 3) {
      attempts++;
      try {
        out = await chatJson<NameOut>({ model: TEXT_MODEL, system: SYSTEM, user, schema, think });
      } catch (error) {
        problems = [{ field: "model", type: "error", text: String(error) }];
        continue;
      }
      out.namePl = normalizeCase(out.namePl.trim(), VOCABULARY);
      problems = checkNameOut(out, ctx);
      if (problems.length === 0) break;
      // Second try with the concrete problems spelled out
      user = `${JSON.stringify(input)}\n\nTwoja poprzednia odpowiedź:\n${JSON.stringify(out)}\n\nPopraw te błędy i zwróć cały JSON ponownie:\n${problems.map((pr) => `- ${pr.field}: ${pr.type} (${pr.text})`).join("\n")}`;
    }

    const status = !out || problems.length > 0 ? "flagged" : "ok";
    if (status !== "ok") flagged++;
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          id: p.id,
          slug: p.slug,
          status,
          attempts,
          seconds: Math.round((Date.now() - t) / 100) / 10,
          before: {
            namePl: p.namePl,
            metaTitlePl: p.metaTitlePl,
            metaDescPl: p.metaDescPl,
            categories: oldSlugs,
          },
          after: out,
          problems,
          primaryParent: out ? (bySlug.get(out.primaryCategory)?.parentSlug ?? null) : null,
          fixedPrimary,
          input,
        },
        null,
        1,
      ),
    );
    done++;
    const rate = (Date.now() - started) / done / 1000;
    console.log(
      `[${done}/${queue.length}] ${status} ${rate.toFixed(1)}s/p  ${p.namePl}  →  ${out?.namePl ?? "—"}  [${out?.primaryCategory ?? ""}]${problems.length ? `  ! ${problems.map((pr) => pr.type).join(",")}` : ""}`,
    );
  }
  console.log(`\nDone ${done}, flagged ${flagged}`);
  await secondOpinions(queue.map((p) => p.id));
  await prisma.$disconnect();
}

/**
 * Phase 2, one model loaded for the whole run: a second model family picks
 * the primary category on its own; disagreement → status "review".
 */
async function secondOpinions(ids: string[]) {
  let disagreed = 0;
  let checked = 0;
  for (const id of ids) {
    const file = path.join(OUT_DIR, `${id}.json`);
    if (!fs.existsSync(file)) continue;
    const rec = JSON.parse(fs.readFileSync(file, "utf8"));
    if (rec.status !== "ok" || rec.fixedPrimary || rec.secondOpinion !== undefined) continue;
    let second: string;
    try {
      second = (
        await chatJson<{ primaryCategory: string }>({
          model: SECOND_MODEL,
          system: SYSTEM,
          user: `${JSON.stringify(rec.input)}\n\nZwróć tylko primaryCategory.`,
          schema: {
            type: "object",
            properties: { primaryCategory: { type: "string", enum: primarySlugs } },
            required: ["primaryCategory"],
          },
        })
      ).primaryCategory;
    } catch {
      second = "error";
    }
    rec.secondOpinion = second;
    if (second !== rec.after.primaryCategory) {
      rec.status = "review";
      disagreed++;
      console.log(`  review  ${rec.after.namePl}: ${rec.after.primaryCategory} ≠ ${second}`);
    }
    checked++;
    fs.writeFileSync(file, JSON.stringify(rec, null, 1));
  }
  console.log(`Second opinion: ${checked} checked, ${disagreed} disagree → review`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
