// Writes brand page texts (Brand.contentPl) from data/content-pass/brands-content/*.json
// ([{ slug, contentPl }]) after banned-claim and link checks. Dry run by default.
//   DATABASE_URL=… npx tsx scripts/content-pass/apply-brands.ts [--apply] [--prod] [--file 01-x.json]
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

const DIR = path.join(__dirname, "../../data/content-pass/brands-content");
const apply = process.argv.includes("--apply");
const fileArg = process.argv.indexOf("--file");
const onlyFile = fileArg >= 0 ? process.argv[fileArg + 1] : null;

type Entry = { slug: string; contentPl: string };

// Same list as apply-posts: brand texts describe companies, never effects
const BANNED = [
  "leczy",
  "leczenie",
  "wyleczy",
  "zwalcza",
  "likwiduje",
  "gwarantuje",
  "cudown",
  "100% skuteczn",
  "detoksyk",
  "spala tłuszcz",
  "przeciwnowotwor",
  "uzdrawia",
  "zapobiega chorob",
  "wspiera",
  "wspomaga",
  "poprawia",
  "wzmacnia",
  "obniża",
  "redukuje",
  "działa przeciw",
];

function plain(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const prisma = connect();
  const [brands, categories, ingredients, posts] = await Promise.all([
    prisma.brand.findMany({ select: { slug: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.ingredient.findMany({ select: { slug: true } }),
    prisma.post.findMany({ select: { slug: true } }),
  ]);
  const known = {
    marki: new Set(brands.map((b) => b.slug)),
    kategoria: new Set(categories.map((c) => c.slug)),
    skladniki: new Set(ingredients.map((i) => i.slug)),
    poradnik: new Set(posts.map((p) => p.slug)),
  };
  const entries = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json") && (!onlyFile || f === onlyFile))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Entry[]);

  const problems: string[] = [];
  for (const e of entries) {
    if (!known.marki.has(e.slug)) problems.push(`${e.slug}: unknown brand`);
    const text = plain(e.contentPl).toLowerCase();
    for (const word of BANNED) if (text.includes(word)) problems.push(`${e.slug}: "${word}"`);
    for (const [, kind, slug] of e.contentPl.matchAll(
      /href="\/(marki|kategoria|skladniki|poradnik)\/([a-z0-9-]+)"/g,
    ))
      if (!known[kind as keyof typeof known].has(slug))
        problems.push(`${e.slug}: unknown /${kind}/${slug}`);
  }
  if (problems.length > 0) {
    console.log(problems.join("\n"));
    throw new Error(`${problems.length} problems — fix the brand files first`);
  }

  for (const e of entries) {
    if (apply)
      await prisma.brand.update({ where: { slug: e.slug }, data: { contentPl: e.contentPl } });
    console.log(`  ${e.slug}: ${plain(e.contentPl).split(" ").length} words`);
  }
  console.log(`${apply ? "Applied" : "Checked"} ${entries.length} brands`);
  if (!apply) console.log("Dry run — pass --apply to write.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
