// Keyword → target URL map from free data: autocomplete (keyword-suggest.ts),
// Google Trends interest (trends.ts) and GSC queries (gsc-report.ts). One URL
// per intent, so pages don't compete:
//   buy / head term ("magnez", "magnez cytrynian 100 mg") → category
//   "na co", "dawkowanie", "skutki uboczne", "niedobór" … → glossary page
//   "jaki", "najlepszy", "czy warto", "jak wybrać" … → guide article
//   need phrases ("na sen", "na stawy") → need category
// Writes docs/keywords-map.json + docs/keywords-map.md (tables per cluster).
//
//   npx tsx scripts/seo/keyword-map.ts
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const SITE = "https://wellbotany.pl";
type Suggest = {
  query: string;
  cluster: string;
  seed: string;
  google: number | null;
  bing: number | null;
};
type Intent = "kategoria" | "glosariusz" | "artykuł" | "potrzeba";

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Retailers, marketplaces and off-topic senses of our terms (lawn iron, magnets…)
const OFF_TOPIC =
  /\b(rossmann|allegro|ceneo|biedronka|lidl|hebe|doz|gemini|ziko|apteka|superpharm|dm|aliexpress|trawnik|lodowk|magnes|roslin|nawoz|akwarium|psa|psow|kota|kotow|konia|gleb|pomidor|storczyk|kosiark|chomik|krolik|wiki|wikipedia|film|piosenk|tekst|kolor|symbol|pierwiastek|chemi|koni|szczeni|collie|corso|owczark|labrador|jellyfish|narine|narum)\w*/;

const INFO =
  /\b(na co|co to|wlasciwosci|dzialanie|jak dziala|dawkowanie|dawka|ile|skutki uboczne|przeciwwskazania|niedobor|nadmiar|objawy|kiedy|rano czy wieczorem|na czczo|interakcje|z czym|czy mozna|czy|w ciazy|dla dzieci|a alkohol|a kawa|wchlanianie|przyswajalnosc|zrodla|w czym jest)\b/;
// Checked before GUIDE: "jakie produkty", "jaka dawka" ask for facts, not a product choice
const INFO_FIRST =
  /\b(jakie (produkty|owoce|warzywa|dawki|ma dzialanie|normy)|jaka (dawka|to witamina)|jaki (poziom|jest dobry wynik|to kwas)|w jakich produktach)\b/;
const GUIDE =
  /\b(jaki|jaka|jakie|ktory|ktora|ktore|najlepszy|najlepsza|najlepsze|ranking|porownanie|vs|czy warto|jak wybrac|jak suplementowac|opinie|forum)\b/;

// Need phrase → need category
const NEEDS: [RegExp, string][] = [
  [/\bna (sen|spanie|bezsennosc|noc)\b/, "na-sen"],
  [/\bna (stres|nerwy|uspokojenie|lek)\b/, "na-stres-i-nerwy"],
  [/\bna (odpornosc|przeziebienie|infekcje)\b/, "na-odpornosc"],
  [/\bna (stawy|kosci|kolana|chrzastke|sciegna)\b/, "na-stawy-i-kosci"],
  [/\bna (jelita|trawienie|wzdecia|zaparcia|biegunke|refluks|zgage)\b/, "na-jelita-i-trawienie"],
  [/\bna (wlosy|skore|paznokcie|tradzik|cere)\b/, "na-wlosy-skore-i-paznokcie"],
  [/\bna (zmeczenie|energie|koncentracje|pamiec)\b/, "na-zmeczenie-i-energie"],
  [/\bna (serce|cisnienie|krazenie|naczynia)\b/, "na-serce-i-krazenie"],
  [/\bna cholesterol\b/, "na-cholesterol"],
  [/\bna (cukier|insulinoopornosc|cukrzyce)\b/, "na-poziom-cukru"],
  [/\bna (odchudzanie|metabolizm|apetyt)\b/, "na-odchudzanie-i-metabolizm"],
  [/\bna (watrobe)\b/, "na-watrobe"],
  [/\bna (tarczyce|hashimoto)\b/, "na-tarczyce"],
  [/\bna (wzrok|oczy)\b/, "na-wzrok"],
  [/\bna (plodnosc|zajscie w ciaze)\b/, "na-plodnosc"],
  [/\bna (libido|potencje)\b/, "na-libido"],
  [/\bna (menopauze|klimakterium)\b/, "na-menopauze"],
  [/\bna prostate\b/, "na-prostate"],
];

// Topic words → our pages. Category/glossary slugs come from the live sitemaps;
// synonyms map how people type a topic to the slug.
const SYNONYMS: Record<string, string> = {
  "witamina d3": "witamina-d",
  "witamina d": "witamina-d",
  "vit d": "witamina-d",
  "witamina k2": "witamina-k2",
  "witamina c": "witamina-c",
  "witamina b12": "witamina-b12",
  b12: "witamina-b12",
  "witamina b": "witaminy-b",
  "omega 3": "omega-3",
  tran: "omega-3",
  "kwas foliowy": "kwas-foliowy",
  folian: "kwas-foliowy",
  "kwas hialuronowy": "kwas-hialuronowy",
  "koenzym q10": "koenzym-q10",
  q10: "koenzym-q10",
  "maslan sodu": "maslan-sodu",
  "lion s mane": "soplowka-jezowata",
  "soplowka jezowata": "soplowka-jezowata",
  rhodiola: "rozeniec-gorski",
  "rozeniec gorski": "rozeniec-gorski",
  "zen szen": "zen-szen",
  "palma sabalowa": "palma-sabalowa",
  ostropest: "ostropest-plamisty",
  probiotyk: "probiotyki",
  probiotyki: "probiotyki",
  "kwas alfa liponowy": "kwas-alfa-liponowy",
  ala: "kwas-alfa-liponowy",
  "beta glukan": "beta-glukan",
  "l teanina": "l-teanina",
};

// Category slug → glossary slug where they differ
const GLOSSARY_ALIAS: Record<string, string> = {
  "witamina-d": "witamina-d3",
  "witaminy-b": "witamina-b12",
  kurkuma: "kurkumina",
  "omega-3-z-alg": "omega-3",
  "olej-z-kryla": "omega-3",
};

// Topic → category slug where the category is named differently
const CATEGORY_ALIAS: Record<string, string> = {
  "maslan-sodu": "maslan-sodu-i-postbiotyki",
  "witamina-b12": "witaminy-b",
  kurkumina: "kurkuma",
  "witamina-d3": "witamina-d",
};

// Existing guide articles and the topics they own
const ARTICLES: Record<string, string> = {
  magnez: "/poradnik/jak-wybrac-magnez",
  "witamina-d": "/poradnik/witamina-d3-jak-suplementowac",
  "witamina-d3": "/poradnik/witamina-d3-jak-suplementowac",
  probiotyki: "/poradnik/jak-wybrac-probiotyk",
  "omega-3": "/poradnik/omega-3-jak-wybrac",
  adaptogeny: "/poradnik/adaptogeny-co-to-jest",
};

async function sitemapSlugs(name: string, prefix: string): Promise<string[]> {
  const xml = await (await fetch(`${SITE}/sitemap/${name}.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(`${SITE}${prefix}`, ""))
    .filter((s) => s && !s.includes("/") && !s.startsWith("http"));
}

function topicOf(q: string, known: Set<string>): string | null {
  // Longest synonym / slug phrase contained in the query wins
  const phrases: [string, string][] = [
    ...Object.entries(SYNONYMS),
    // Audience (dla-*) and need (na-*) categories are modifiers, not topics
    ...[...known]
      .filter((slug) => !/^(dla|na)-/.test(slug))
      .map((slug) => [slug.replace(/-/g, " "), slug] as [string, string]),
  ].sort((a, b) => b[0].length - a[0].length);
  for (const [phrase, slug] of phrases) if (new RegExp(`\\b${phrase}\\b`).test(q)) return slug;
  return null;
}

async function main() {
  const suggest: Suggest[] = JSON.parse(readFileSync("docs/keywords-suggest.json", "utf8"));
  const trends: Record<string, { interest: number; peakMonths: number[] }> = existsSync(
    "docs/trends.json",
  )
    ? JSON.parse(readFileSync("docs/trends.json", "utf8"))
    : {};
  const gscFile = existsSync("docs/gsc")
    ? readdirSync("docs/gsc")
        .filter((f) => f.endsWith(".json"))
        .sort()
        .pop()
    : undefined;
  const gsc = new Map<string, { impressions: number; position: number }>(
    gscFile
      ? (
          JSON.parse(readFileSync(`docs/gsc/${gscFile}`, "utf8")).queries as {
            keys: string[];
            impressions: number;
            position: number;
          }[]
        ).map((r) => [fold(r.keys[0]), r])
      : [],
  );

  const categories = new Set(await sitemapSlugs("categories", "/kategoria/"));
  const glossary = new Set(await sitemapSlugs("ingredients", "/skladniki/"));
  const known = new Set([...categories, ...glossary]);
  const trendBySlug = new Map(
    Object.entries(trends).map(([term, t]) => [topicOf(fold(term), known) ?? term, t]),
  );

  const rows = [];
  for (const s of suggest) {
    const q = fold(s.query);
    if (OFF_TOPIC.test(q) || q.length < 3) continue;
    const need = NEEDS.find(([re]) => re.test(q))?.[1];
    const topic = topicOf(q, known);
    if (!topic && !need) continue;
    const intent: Intent = INFO_FIRST.test(q)
      ? "glosariusz"
      : GUIDE.test(q)
        ? "artykuł"
        : INFO.test(q)
          ? "glosariusz"
          : need && (!topic || /^(suplementy|witaminy|tabletki|srodki)/.test(q))
            ? "potrzeba"
            : "kategoria";
    let target: string | null = null;
    let status = "istnieje";
    if (intent === "artykuł") {
      target = (topic && ARTICLES[topic]) ?? null;
      if (!target) {
        target = `/poradnik/(nowy: ${topic ?? need})`;
        status = "do napisania";
      }
    } else if (intent === "glosariusz") {
      const entry = topic && (GLOSSARY_ALIAS[topic] ?? topic);
      if (entry && glossary.has(entry)) target = `/skladniki/${entry}`;
      else {
        target = `/skladniki/(nowy: ${topic ?? need})`;
        status = "do napisania";
      }
    } else if (intent === "potrzeba" && need) {
      target = `/kategoria/${need}`;
    } else if (topic) {
      const cat = CATEGORY_ALIAS[topic] ?? topic;
      // No own category: the glossary page (it lists the products) takes the head term
      target = categories.has(cat)
        ? `/kategoria/${cat}`
        : glossary.has(topic)
          ? `/skladniki/${topic}`
          : null;
      if (!target) {
        target = `/kategoria/(brak: ${topic})`;
        status = "brak kategorii";
      }
    }
    const g = gsc.get(q);
    const trend = topic ? trendBySlug.get(topic) : undefined;
    // Demand proxy: autocomplete rank in both engines + Trends interest of the topic
    const score =
      (s.google ? 11 - s.google : 0) +
      (s.bing ? 9 - Math.min(s.bing, 8) : 0) +
      (trend ? Math.log2(1 + trend.interest) : 0) +
      (g ? Math.log2(1 + g.impressions) * 2 : 0);
    rows.push({
      query: s.query,
      cluster: s.cluster,
      topic: topic ?? need,
      intent,
      target,
      status,
      score: Number(score.toFixed(1)),
      gscImpressions: g?.impressions ?? 0,
      gscPosition: g ? Number(g.position.toFixed(1)) : null,
    });
  }
  rows.sort((a, b) => b.score - a.score);
  writeFileSync("docs/keywords-map.json", JSON.stringify(rows, null, 1));

  const clusters = [...new Set(rows.map((r) => r.cluster))];
  const table = (list: typeof rows) =>
    `| zapytanie | intencja | cel | status | wynik |\n|---|---|---|---|---|\n${list
      .map((r) => `| ${r.query} | ${r.intent} | ${r.target} | ${r.status} | ${r.score} |`)
      .join("\n")}`;
  const todo = new Map<string, { score: number; queries: string[] }>();
  for (const r of rows.filter((x) => x.status !== "istnieje")) {
    const key = r.target ?? "";
    const e = todo.get(key) ?? { score: 0, queries: [] };
    e.score += r.score;
    if (e.queries.length < 6) e.queries.push(r.query);
    todo.set(key, e);
  }
  const md = `# Mapa słów kluczowych — dane (${new Date().toISOString().slice(0, 10)})

${rows.length} zapytań po filtrach. „wynik” = pozycja w podpowiedziach Google i Bing + popularność tematu w Trends + wyświetlenia w GSC.

## Brakujące strony wg popytu

| strona | suma wyniku | przykładowe zapytania |
|---|---|---|
${[...todo]
  .sort((a, b) => b[1].score - a[1].score)
  .slice(0, 40)
  .map(([t, e]) => `| ${t} | ${e.score.toFixed(0)} | ${e.queries.join("; ")} |`)
  .join("\n")}

${clusters
  .map((c) => `## Klaster: ${c}\n\n${table(rows.filter((r) => r.cluster === c).slice(0, 30))}`)
  .join("\n\n")}
`;
  writeFileSync("docs/keywords-map.md", md);
  console.log(`${rows.length} queries → docs/keywords-map.json, docs/keywords-map.md`);
  console.log(`missing pages: ${todo.size}`);
}

main();
