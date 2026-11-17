// One-off (plan "Zdrowa żywność", 2026-11-17): chocolate moves under
// "Zdrowa żywność", the food tab comes before "Kosmetyki", food subcategories
// are ordered by size, and six food categories get their intro + meta texts.
// URLs stay the same (/kategoria/<slug>), so no redirects.
//   node --env-file=<env with DATABASE_URL> node_modules/tsx/dist/cli.mjs scripts/food-menu.ts [--apply] [--no-refresh]
// Dry run by default: prints every field that would change (before → after).
// With --apply, the old values go to prisma/backups/food-menu-backup-<timestamp>.json,
// the rows are updated in one transaction, then the live site's caches expire
// (--no-refresh skips that, e.g. on a local DB).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { refreshSite } from "./lib/refresh-site";

type Texts = { metaTitlePl: string; metaDescPl: string; descriptionPl: string };
type Change = Partial<Texts> & { parentSlug?: string; group?: "OTHER"; sortOrder?: number };

// Same text as the intro and the meta description (plan §5, E1)
const texts = (metaTitlePl: string, desc: string): Texts => ({
  metaTitlePl,
  metaDescPl: desc,
  descriptionPl: desc,
});

const CHANGES: Record<string, Change> = {
  zywnosc: {
    sortOrder: 37, // kosmetyki is 38
    ...texts(
      "Zdrowa żywność – czekolady, ciastka, przekąski",
      "Czekolady, ciastka, chipsy, batony, przekąski owocowe, kawa i przyprawy – z pełnym składem przy każdym produkcie. Wysyłka w ciągu 2 dni roboczych.",
    ),
  },
  "czekolady-i-czekoladki": {
    parentSlug: "zywnosc",
    group: "OTHER",
    sortOrder: 87,
    ...texts(
      "Czekolady gorzkie, mleczne i z nadzieniem",
      "Czekolady Cocoa, Vivani, Meybona, Rapunzel i Benjamissimo: gorzkie, mleczne, z orzechami i nadzieniem. Pełny skład przy każdej tabliczce.",
    ),
  },
  "ciastka-i-wafle": {
    sortOrder: 88,
    ...texts(
      "Ciastka, herbatniki i wafle",
      "Ciastka owsiane i orkiszowe, herbatniki, wafle i rurki – także wersje bezglutenowe i bez dodatku cukrów. Pełny skład przy każdym produkcie.",
    ),
  },
  "chipsy-i-przekaski-slone": {
    sortOrder: 89,
    ...texts(
      "Chipsy, paluszki, chrupki i krakersy",
      "Chipsy, paluszki orkiszowe, chrupki kukurydziane, popcorn i krakersy od Trafo, Popcrop, Envoy i innych. Pełny skład przy każdym produkcie.",
    ),
  },
  batony: { sortOrder: 90 },
  slodycze: {
    sortOrder: 91,
    ...texts(
      "Żelki, krówki, chałwa i inne słodycze",
      "Żelki, krówki, chałwa, sezamki, migdały w czekoladzie i guma z ksylitolem. Pełny skład przy każdym produkcie, wysyłka w ciągu 2 dni roboczych.",
    ),
  },
  "przekaski-owocowe": {
    sortOrder: 92,
    ...texts(
      "Przekąski owocowe – chipsy jabłkowe i bananowe",
      "Chipsy jabłkowe i bananowe, rolki owocowe Bob Snail i owoce w czekoladzie. Część bez dodatku cukrów – zawsze widać to w nazwie i składzie.",
    ),
  },
  "przyprawy-i-sol": { sortOrder: 93 },
  "kawa-i-herbata": { sortOrder: 94 },
  slodziki: { sortOrder: 95 },
};

// Nutrition claims and brand names in the texts must be true for the category
// today: at least one active product whose name (or brand) contains each term.
const MUST_HAVE: Record<string, string[]> = {
  "czekolady-i-czekoladki": ["Cocoa", "Vivani", "Meybona", "Rapunzel", "Benjamissimo"],
  "ciastka-i-wafle": ["bezglut", "bez dodatku cukr"],
  "chipsy-i-przekaski-slone": ["Trafo", "Popcrop", "Envoy"],
  "przekaski-owocowe": ["Bob Snail", "bez dodatku cukr"],
};

// Not for uncertified food (Reg. 2018/848 art. 30), no health claims (Reg. 1924/2006)
const BANNED = /\b(bio|eko\w*|organic\w*|zdrow[aeyi]\w*)\b/i;
const MAX_META_TITLE = 46; // + " | Well Botany" = 60
const MAX_META_DESC = 160;

const FIELDS = [
  "parentId",
  "group",
  "sortOrder",
  "metaTitlePl",
  "metaDescPl",
  "descriptionPl",
] as const;
type Field = (typeof FIELDS)[number];

function textProblems(): string[] {
  const problems: string[] = [];
  for (const [slug, c] of Object.entries(CHANGES)) {
    if (c.metaTitlePl && c.metaTitlePl.length > MAX_META_TITLE)
      problems.push(`${slug}: meta title ${c.metaTitlePl.length} chars`);
    if (c.metaDescPl && c.metaDescPl.length > MAX_META_DESC)
      problems.push(`${slug}: meta description ${c.metaDescPl.length} chars`);
    // The section is called "Zdrowa żywność"; nothing else may say "zdrowy"
    const text = [c.metaTitlePl, c.descriptionPl].join(" ").replaceAll("Zdrowa żywność", "");
    const banned = text.match(BANNED);
    if (banned) problems.push(`${slug}: "${banned[0]}"`);
  }
  return problems;
}

async function claimProblems(idBySlug: Map<string, string>): Promise<string[]> {
  const problems: string[] = [];
  for (const [slug, terms] of Object.entries(MUST_HAVE)) {
    for (const term of terms) {
      const count = await prisma.product.count({
        where: {
          status: "ACTIVE",
          categoryLinks: { some: { categoryId: idBySlug.get(slug) } },
          OR: [
            { namePl: { contains: term, mode: "insensitive" } },
            { brand: { name: { contains: term, mode: "insensitive" } } },
          ],
        },
      });
      if (count === 0) problems.push(`${slug}: no active product for "${term}"`);
    }
  }
  return problems;
}

// tsx runs this file as CommonJS, so no top-level await
async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.DATABASE_URL ?? "";
  console.log(`DB: ${url.replace(/\/\/[^@]+@/, "//***@").split("?")[0]}`);

  const rows = await prisma.category.findMany({
    where: { slug: { in: Object.keys(CHANGES) } },
    select: {
      id: true,
      slug: true,
      parentId: true,
      group: true,
      sortOrder: true,
      metaTitlePl: true,
      metaDescPl: true,
      descriptionPl: true,
    },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));

  const missing = Object.keys(CHANGES).filter((slug) => !bySlug.has(slug));
  const problems = [
    ...missing.map((slug) => `${slug}: no such category`),
    ...textProblems(),
    ...(missing.length ? [] : await claimProblems(idBySlug)),
  ];
  if (problems.length > 0) {
    console.log(problems.join("\n"));
    throw new Error(`${problems.length} problems — nothing written`);
  }

  // Field-by-field diff against the DB; unchanged fields are left out
  const updates = Object.entries(CHANGES).flatMap(([slug, { parentSlug, ...change }]) => {
    const row = bySlug.get(slug);
    if (!row) return [];
    const target: Partial<Record<Field, unknown>> = {
      ...change,
      ...(parentSlug && { parentId: idBySlug.get(parentSlug) }),
    };
    const before: Partial<Record<Field, unknown>> = {};
    const after: Partial<Record<Field, unknown>> = {};
    for (const f of FIELDS) {
      if (f in target && target[f] !== row[f]) {
        before[f] = row[f];
        after[f] = target[f];
      }
    }
    return Object.keys(after).length ? [{ id: row.id, slug, before, after }] : [];
  });

  const name = (v: unknown) => rows.find((r) => r.id === v)?.slug ?? v;
  for (const u of updates) {
    console.log(`\n${u.slug}`);
    for (const f of Object.keys(u.after) as Field[]) {
      const show = (v: unknown) => JSON.stringify(f === "parentId" ? name(v) : v);
      console.log(`  ${f}: ${show(u.before[f])}\n    → ${show(u.after[f])}`);
    }
  }
  console.log(`\n${updates.length} categories to change`);
  if (updates.length === 0) return;

  if (!apply) {
    console.log("dry run — pass --apply to write");
    return;
  }
  mkdirSync("prisma/backups", { recursive: true });
  const backup = join("prisma/backups", `food-menu-backup-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify(updates, null, 1));
  console.log(`backup → ${backup}`);
  await prisma.$transaction(
    updates.map((u) =>
      prisma.category.update({
        where: { id: u.id },
        data: u.after as Prisma.CategoryUncheckedUpdateInput,
      }),
    ),
  );
  console.log(`changed ${updates.length} categories`);
  // The menu, home and category pages show the new tree now, not after the next deploy
  if (!process.argv.includes("--no-refresh")) await refreshSite({ merchant: false });
}

main().finally(() => prisma.$disconnect());
