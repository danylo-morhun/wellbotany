// Appends FAQ rows to existing guides (Post) and ingredient pages (Ingredient)
// from data/content-pass/faq-additions/<file>.json
// ([{ model: "post" | "ingredient", slug, faq: [{ q, a }] }]).
// Only adds questions the page does not have yet — content and other rows stay
// as they are in the DB, so admin edits are kept. With --apply it also adds the
// rows to the source files in data/content-pass/posts|glossary.
// Dry run by default.
//   DATABASE_URL=… npx tsx scripts/content-pass/add-faq.ts <file.json> [--apply] [--prod]
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

type Faq = { q: string; a: string };
type Addition = { model: "post" | "ingredient"; slug: string; faq: Faq[] };

const ROOT = path.join(__dirname, "../../data/content-pass");
const apply = process.argv.includes("--apply");
const file = process.argv[2];

// Same list as apply-posts.ts: unauthorized effect wording
const BANNED = [
  "leczy",
  "leczenie",
  "wyleczy",
  "zwalcza",
  "likwiduje",
  "gwarantuje skuteczn",
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

const sameQuestion = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Rows from `extra` whose question is not in `current` yet. */
export function missingRows(current: Faq[], extra: Faq[]): Faq[] {
  return extra.filter((row) => !current.some((c) => sameQuestion(c.q, row.q)));
}

function bannedWords(rows: Faq[]): string[] {
  const text = rows
    .flatMap((r) => [r.q, r.a])
    .join(" ")
    .toLowerCase();
  return BANNED.filter((word) => text.includes(word));
}

function addToSourceFile(addition: Addition) {
  const dir = path.join(ROOT, addition.model === "post" ? "posts" : "glossary");
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const full = path.join(dir, name);
    const entries = JSON.parse(fs.readFileSync(full, "utf8")) as { slug: string; faqPl: Faq[] }[];
    const entry = entries.find((e) => e.slug === addition.slug);
    if (!entry) continue;
    entry.faqPl = [...entry.faqPl, ...missingRows(entry.faqPl, addition.faq)];
    fs.writeFileSync(full, `${JSON.stringify(entries, null, 2)}\n`);
    return;
  }
  console.log(`  ${addition.slug}: no source file — DB only`);
}

async function main() {
  if (!file) throw new Error("Pass the additions file, e.g. 2026-11-21-gsc.json");
  const additions = JSON.parse(
    fs.readFileSync(path.join(ROOT, "faq-additions", file), "utf8"),
  ) as Addition[];

  const problems = additions.flatMap((a) => bannedWords(a.faq).map((w) => `${a.slug}: "${w}"`));
  if (problems.length > 0) {
    console.log(problems.join("\n"));
    throw new Error(`${problems.length} banned words — fix the additions file first`);
  }

  const prisma = connect();
  for (const addition of additions) {
    const where = { slug: addition.slug };
    const row =
      addition.model === "post"
        ? await prisma.post.findUnique({ where, select: { faqPl: true } })
        : await prisma.ingredient.findUnique({ where, select: { faqPl: true } });
    if (!row) {
      console.log(`  ${addition.slug}: not found in DB — skipped`);
      continue;
    }
    const current = (row.faqPl ?? []) as Faq[];
    const added = missingRows(current, addition.faq);
    console.log(`  ${addition.model} ${addition.slug}: ${current.length} rows, +${added.length}`);
    for (const r of added) console.log(`    + ${r.q}`);
    if (!apply || added.length === 0) continue;
    const faqPl = [...current, ...added];
    if (addition.model === "post") await prisma.post.update({ where, data: { faqPl } });
    else await prisma.ingredient.update({ where, data: { faqPl } });
    addToSourceFile(addition);
  }
  console.log(apply ? "Applied." : "Dry run — pass --apply to write.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
