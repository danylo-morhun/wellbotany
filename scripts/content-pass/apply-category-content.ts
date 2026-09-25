// Writes category SEO content (data/content-pass/categories/content/*.json:
// [{ slug, headingPl?, descriptionPl, metaTitlePl, metaDescPl, contentPl, faqPl }])
// to the DB. Checks every text against the banned-claim list first; links
// inside contentPl must point at existing categories. Dry run by default.
//   DATABASE_URL=… npx tsx scripts/content-pass/apply-category-content.ts [--apply] [--prod]
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

const DIR = path.join(__dirname, "../../data/content-pass/categories/content");
const apply = process.argv.includes("--apply");

type Entry = {
  slug: string;
  headingPl?: string;
  descriptionPl: string;
  metaTitlePl: string;
  metaDescPl: string;
  contentPl: string;
  faqPl: { q: string; a: string }[];
};

// Wording no supplement text may use (medical / non-authorized claims)
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
  const categories = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [
      c.slug,
      c.id,
    ]),
  );
  const entries = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Entry[]);

  const problems: string[] = [];
  for (const e of entries) {
    if (!categories.has(e.slug)) problems.push(`${e.slug}: unknown category`);
    const text = [e.descriptionPl, e.contentPl, ...e.faqPl.flatMap((f) => [f.q, f.a])]
      .join(" ")
      .toLowerCase();
    for (const word of BANNED) if (text.includes(word)) problems.push(`${e.slug}: "${word}"`);
    for (const [, slug] of e.contentPl.matchAll(/href="\/kategoria\/([a-z0-9-]+)"/g))
      if (!categories.has(slug)) problems.push(`${e.slug}: link to unknown /kategoria/${slug}`);
    if (e.metaDescPl.length > 160)
      problems.push(`${e.slug}: metaDesc ${e.metaDescPl.length} chars`);
  }
  if (problems.length > 0) {
    console.log(problems.join("\n"));
    throw new Error(`${problems.length} problems — fix the content files first`);
  }

  for (const e of entries) {
    if (apply) {
      await prisma.category.update({
        where: { slug: e.slug },
        data: {
          ...(e.headingPl && { headingPl: e.headingPl }),
          descriptionPl: e.descriptionPl,
          metaTitlePl: e.metaTitlePl,
          metaDescPl: e.metaDescPl,
          contentPl: e.contentPl,
          faqPl: e.faqPl,
        },
      });
    }
  }
  console.log(`${apply ? "Applied" : "Checked"} ${entries.length} categories`);
  if (!apply) console.log("Dry run — pass --apply to write.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
