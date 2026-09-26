// Free keyword research: Google + Bing autocomplete (pl-PL) for seed terms,
// expanded with question/intent modifiers. No volumes — autocomplete order is
// a rough popularity signal; GSC impressions are added later where we rank.
//
//   npx tsx scripts/seo/keyword-suggest.ts [--seeds seeds.json] [--out docs/keywords-suggest.json]
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = arg("--out", "docs/keywords-suggest.json");
const seedsFile = arg("--seeds", "");

// cluster → seed terms (Polish, as people type them)
const DEFAULT_SEEDS: Record<string, string[]> = {
  sen: [
    "melatonina",
    "magnez na sen",
    "suplementy na sen",
    "ashwagandha",
    "l-teanina",
    "glicyna",
    "melisa",
  ],
  odpornosc: [
    "witamina d3",
    "witamina d",
    "cynk",
    "witamina c",
    "suplementy na odporność",
    "laktoferyna",
    "czarny bez",
  ],
  stawy: [
    "kolagen",
    "glukozamina",
    "msm",
    "kurkumina",
    "suplementy na stawy",
    "kolagen typu 2",
    "kwas hialuronowy",
  ],
  jelita: [
    "probiotyk",
    "maślan sodu",
    "błonnik",
    "berberyna",
    "probiotyk po antybiotyku",
    "prebiotyk",
    "enzymy trawienne",
  ],
  skora_wlosy: [
    "biotyna",
    "suplementy na włosy",
    "kolagen na skórę",
    "krzem",
    "skrzyp polny",
    "suplementy na paznokcie",
  ],
  energia_stres: [
    "koenzym q10",
    "rhodiola",
    "witamina b12",
    "witamina b kompleks",
    "adaptogeny",
    "żeń-szeń",
    "magnez",
  ],
  serce_krazenie: [
    "omega 3",
    "tran",
    "witamina k2",
    "nattokinaza",
    "czosnek",
    "koenzym q10 na serce",
  ],
  kobiety_ciaza: [
    "kwas foliowy",
    "witaminy dla kobiet w ciąży",
    "inozytol",
    "dha w ciąży",
    "żelazo",
    "menopauza suplementy",
  ],
  mezczyzni: [
    "suplementy dla mężczyzn",
    "prostata suplementy",
    "cynk dla mężczyzn",
    "maca",
    "tribulus",
  ],
  metabolizm: [
    "chrom",
    "berberyna na odchudzanie",
    "suplementy na insulinooporność",
    "inozytol na insulinooporność",
    "cynamon",
  ],
  mozg: [
    "lion's mane",
    "bacopa",
    "ginkgo biloba",
    "suplementy na pamięć",
    "cholina",
    "omega 3 dla dzieci",
  ],
  grzyby: ["reishi", "chaga", "cordyceps", "soplówka jeżowata", "grzyby funkcjonalne"],
};

const MODIFIERS = [
  "",
  " na",
  " dla",
  " jaki",
  " najlepszy",
  " dawkowanie",
  " na co",
  " skutki uboczne",
  " czy",
  " opinie",
  " w ciąży",
  " dla dzieci",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function google(q: string): Promise<string[]> {
  const res = await fetch(
    `https://suggestqueries.google.com/complete/search?client=firefox&hl=pl&gl=pl&q=${encodeURIComponent(q)}`,
  );
  if (!res.ok) return [];
  // Latin-1 by default for this client; ask for UTF-8 via text decode of bytes
  const body = JSON.parse(new TextDecoder("utf-8").decode(await res.arrayBuffer()));
  return body[1] ?? [];
}

async function bing(q: string): Promise<string[]> {
  const res = await fetch(
    `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(q)}&mkt=pl-PL`,
  );
  if (!res.ok) return [];
  return ((await res.json()) as [string, string[]])[1] ?? [];
}

type Row = {
  query: string;
  cluster: string;
  seed: string;
  google: number | null;
  bing: number | null;
};

async function main() {
  const seeds: Record<string, string[]> =
    seedsFile && existsSync(seedsFile)
      ? JSON.parse(readFileSync(seedsFile, "utf8"))
      : DEFAULT_SEEDS;
  const rows = new Map<string, Row>();
  for (const [cluster, terms] of Object.entries(seeds)) {
    for (const seed of terms) {
      for (const mod of MODIFIERS) {
        const q = `${seed}${mod}`;
        const [g, b] = await Promise.all([google(q), bing(q)]);
        // Rank = best (lowest) position the phrase reached in any expansion
        g.forEach((s, i) => {
          const key = s.toLowerCase().trim();
          const row = rows.get(key) ?? { query: key, cluster, seed, google: null, bing: null };
          row.google = row.google === null ? i + 1 : Math.min(row.google, i + 1);
          rows.set(key, row);
        });
        b.forEach((s, i) => {
          const key = s.toLowerCase().trim();
          const row = rows.get(key) ?? { query: key, cluster, seed, google: null, bing: null };
          row.bing = row.bing === null ? i + 1 : Math.min(row.bing, i + 1);
          rows.set(key, row);
        });
        await sleep(350);
      }
      console.log(`${cluster} / ${seed}: ${rows.size} total`);
    }
  }
  writeFileSync(out, JSON.stringify([...rows.values()], null, 1));
  console.log(`${rows.size} queries → ${out}`);
}

main();
