// Upserts blog guides (/poradnik) from data/content-pass/posts/*.json
// ([{ slug, titlePl, excerptPl, metaTitlePl?, metaDescPl?, contentPl, faqPl,
// categorySlug?, coverImage?, isPublished? }]) after banned-claim and link
// checks. reviewedBy is never written here — it is set in /admin/poradnik.
// Dry run by default; prints every claim-like sentence for a manual check
// against data/content-pass/rules/eu-claims.md.
//   DATABASE_URL=… npx tsx scripts/content-pass/apply-posts.ts [--apply] [--prod]
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

const DIR = path.join(__dirname, "../../data/content-pass/posts");
const apply = process.argv.includes("--apply");

type Entry = {
  slug: string;
  titlePl: string;
  excerptPl: string;
  metaTitlePl?: string;
  metaDescPl?: string;
  contentPl: string;
  faqPl: { q: string; a: string }[];
  categorySlug?: string;
  coverImage?: string;
  isPublished?: boolean;
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
  // Typical unauthorized effect verbs — the register only uses
  // "pomaga w…" / "przyczynia się do…" / "jest potrzebny do…"
  "wspiera",
  "wspomaga",
  "poprawia",
  "wzmacnia",
  "obniża",
  "redukuje",
  "działa przeciw",
];

// Sentences that read like an effect claim — listed for manual review
const CLAIM_VERBS = /(pomaga|przyczynia|jest potrzebn|zwiększa)/i;

function plain(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const prisma = connect();
  const [categories, ingredients, existingPosts] = await Promise.all([
    prisma.category.findMany({ select: { slug: true } }),
    prisma.ingredient.findMany({ select: { slug: true } }),
    prisma.post.findMany({ select: { slug: true } }),
  ]);
  const categorySlugs = new Set(categories.map((c) => c.slug));
  const ingredientSlugs = new Set(ingredients.map((i) => i.slug));
  const entries = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Entry[]);
  const postSlugs = new Set([...existingPosts.map((p) => p.slug), ...entries.map((e) => e.slug)]);

  const problems: string[] = [];
  const claims: string[] = [];
  for (const e of entries) {
    const text = plain(
      [
        e.titlePl,
        e.excerptPl,
        e.metaDescPl ?? "",
        e.contentPl,
        ...e.faqPl.flatMap((f) => [f.q, f.a]),
      ].join(" "),
    );
    for (const word of BANNED)
      if (text.toLowerCase().includes(word)) problems.push(`${e.slug}: "${word}"`);
    for (const sentence of text.split(/(?<=[.!?])\s+/))
      if (CLAIM_VERBS.test(sentence)) claims.push(`  ${e.slug}: ${sentence}`);
    for (const [, slug] of e.contentPl.matchAll(/href="\/kategoria\/([a-z0-9-]+)"/g))
      if (!categorySlugs.has(slug)) problems.push(`${e.slug}: unknown /kategoria/${slug}`);
    for (const [, slug] of e.contentPl.matchAll(/href="\/skladniki\/([a-z0-9-]+)"/g))
      if (!ingredientSlugs.has(slug)) problems.push(`${e.slug}: unknown /skladniki/${slug}`);
    for (const [, slug] of e.contentPl.matchAll(/href="\/poradnik\/([a-z0-9-]+)"/g))
      if (!postSlugs.has(slug)) problems.push(`${e.slug}: unknown /poradnik/${slug}`);
    if (e.categorySlug && !categorySlugs.has(e.categorySlug))
      problems.push(`${e.slug}: unknown categorySlug ${e.categorySlug}`);
    if ((e.metaDescPl ?? e.excerptPl).length > 160)
      problems.push(`${e.slug}: meta description > 160`);
    // " | Well Botany" is appended by the title template
    if ((e.metaTitlePl ?? e.titlePl).length > 47) problems.push(`${e.slug}: meta title > 47`);
    if (e.excerptPl.length > 300) problems.push(`${e.slug}: excerpt > 300`);
    if (!/^[a-z0-9-]+$/.test(e.slug)) problems.push(`${e.slug}: bad slug`);
  }
  if (claims.length > 0)
    console.log(`Claim-like sentences (check against eu-claims.md):\n${claims.join("\n")}\n`);
  if (problems.length > 0) {
    console.log(problems.join("\n"));
    throw new Error(`${problems.length} problems — fix the post files first`);
  }

  for (const e of entries) {
    const isPublished = e.isPublished ?? true;
    const data = {
      titlePl: e.titlePl,
      excerptPl: e.excerptPl,
      metaTitlePl: e.metaTitlePl ?? null,
      metaDescPl: e.metaDescPl ?? null,
      contentPl: e.contentPl,
      faqPl: e.faqPl,
      categorySlug: e.categorySlug ?? null,
      coverImage: e.coverImage ?? null,
      isPublished,
    };
    if (apply) {
      const existing = await prisma.post.findUnique({
        where: { slug: e.slug },
        select: { publishedAt: true },
      });
      // Same rule as the admin action: the first publication date sticks
      const publishedAt = isPublished ? (existing?.publishedAt ?? new Date()) : null;
      await prisma.post.upsert({
        where: { slug: e.slug },
        create: { slug: e.slug, ...data, publishedAt },
        update: { ...data, publishedAt },
      });
    }
    console.log(`  ${e.slug}: ${plain(e.contentPl).split(" ").length} words`);
  }
  console.log(`${apply ? "Applied" : "Checked"} ${entries.length} posts`);
  if (!apply) console.log("Dry run — pass --apply to write.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
