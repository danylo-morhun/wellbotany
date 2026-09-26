// Upserts ingredient glossary pages from data/content-pass/glossary/*.json
// ([{ slug, namePl, matchTerms, excludeTerms?, shortPl, metaTitlePl?, metaDescPl?,
// contentPl, faqPl, categorySlug? }]) after the same banned-claim and link
// checks as category content. Dry run by default.
//   DATABASE_URL=… npx tsx scripts/content-pass/apply-glossary.ts [--apply] [--prod] [--file 03-x.json]
// --file limits the run to one data file, so entries edited in the admin since
// their file was applied are not overwritten.
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

const DIR = path.join(__dirname, "../../data/content-pass/glossary");
const apply = process.argv.includes("--apply");
const fileArg = process.argv.indexOf("--file");
const onlyFile = fileArg >= 0 ? process.argv[fileArg + 1] : null;

type Entry = {
  slug: string;
  namePl: string;
  matchTerms: string[];
  excludeTerms?: string[];
  shortPl: string;
  metaTitlePl?: string;
  metaDescPl?: string;
  contentPl: string;
  faqPl: { q: string; a: string }[];
  categorySlug?: string;
};

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
];

async function main() {
  const prisma = connect();
  const categories = new Set(
    (await prisma.category.findMany({ select: { slug: true } })).map((c) => c.slug),
  );
  const entries = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json") && (!onlyFile || f === onlyFile))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Entry[]);
  // Links may point at pages already in the DB, not only at this run's files
  const slugs = new Set([
    ...entries.map((e) => e.slug),
    ...(await prisma.ingredient.findMany({ select: { slug: true } })).map((i) => i.slug),
  ]);

  const problems: string[] = [];
  for (const e of entries) {
    const text = [e.shortPl, e.contentPl, ...e.faqPl.flatMap((f) => [f.q, f.a])]
      .join(" ")
      .toLowerCase();
    for (const word of BANNED) if (text.includes(word)) problems.push(`${e.slug}: "${word}"`);
    for (const [, slug] of e.contentPl.matchAll(/href="\/kategoria\/([a-z0-9-]+)"/g))
      if (!categories.has(slug)) problems.push(`${e.slug}: unknown /kategoria/${slug}`);
    for (const [, slug] of e.contentPl.matchAll(/href="\/skladniki\/([a-z0-9-]+)"/g))
      if (!slugs.has(slug)) problems.push(`${e.slug}: unknown /skladniki/${slug}`);
    if (e.categorySlug && !categories.has(e.categorySlug))
      problems.push(`${e.slug}: unknown categorySlug ${e.categorySlug}`);
    if ((e.metaDescPl ?? e.shortPl).length > 160)
      problems.push(`${e.slug}: meta description > 160`);
    if (e.matchTerms.length === 0) problems.push(`${e.slug}: no matchTerms`);
  }
  if (problems.length > 0) {
    console.log(problems.join("\n"));
    throw new Error(`${problems.length} problems — fix the glossary files first`);
  }

  for (const e of entries) {
    const data = {
      namePl: e.namePl,
      matchTerms: e.matchTerms.map((t) => t.toLowerCase()),
      excludeTerms: (e.excludeTerms ?? []).map((t) => t.toLowerCase()),
      shortPl: e.shortPl,
      metaTitlePl: e.metaTitlePl ?? null,
      metaDescPl: e.metaDescPl ?? null,
      contentPl: e.contentPl,
      faqPl: e.faqPl,
      categorySlug: e.categorySlug ?? null,
    };
    if (apply)
      await prisma.ingredient.upsert({
        where: { slug: e.slug },
        create: { slug: e.slug, ...data },
        update: data,
      });
    const matches = await prisma.product.count({
      where: {
        status: "ACTIVE",
        OR: data.matchTerms.map((t) => ({ namePl: { contains: t, mode: "insensitive" as const } })),
        NOT: data.excludeTerms.map((t) => ({
          namePl: { contains: t, mode: "insensitive" as const },
        })),
      },
    });
    console.log(`  ${e.slug}: ${matches} products`);
  }
  console.log(`${apply ? "Applied" : "Checked"} ${entries.length} ingredients`);
  if (!apply) console.log("Dry run — pass --apply to write.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
