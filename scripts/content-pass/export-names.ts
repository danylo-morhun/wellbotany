// Name pass → CSV for the owner's review (before → after, categories,
// problems), with manual overrides from names-overrides.json merged in.
//   npx tsx scripts/content-pass/export-names.ts
import fs from "node:fs";
import path from "node:path";
import { loadNameResults } from "./lib/name-results";

const OUT = path.join(__dirname, "../../data/content-pass/reports/names-review.csv");

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const rows = loadNameResults().map((r) =>
  [
    r.status,
    r.slug,
    r.before.namePl,
    r.after?.namePl,
    r.after?.metaTitlePl,
    r.after?.metaDescPl,
    r.after?.primaryCategory,
    r.secondOpinion ?? "",
    r.after?.extraCategories.join(" "),
    r.before.categories.join(" "),
    (r.problems ?? []).map((p) => `${p.field}:${p.type}:${p.text}`).join("; "),
  ]
    .map(cell)
    .join(","),
);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  `﻿${[
    "status,slug,nazwa przed,nazwa po,meta title,meta description,kategoria główna,druga opinia,kategorie dodatkowe,stare kategorie,problemy",
    ...rows,
  ].join("\n")}\n`,
);
console.log(`${rows.length} rows → ${OUT}`);
