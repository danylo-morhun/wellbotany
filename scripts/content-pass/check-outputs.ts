// Runs the deterministic checks over writer outputs in a folder:
//   npx tsx scripts/content-pass/check-outputs.ts data/content-pass/pilot
// For each KEY.<model>.json next to KEY.sources.json + KEY.input.json, writes
// KEY.<model>.check.json and prints a summary. Read-only; no DB.
import fs from "node:fs";
import path from "node:path";
import { checkProduct, isValidGtin, type Problem } from "./lib/check";

const dir = process.argv[2] ?? "data/content-pass/pilot";
const tree = JSON.parse(fs.readFileSync("data/content-pass/categories/tree.json", "utf8"));
const categorySlugs = new Set<string>(tree.categories.map((c: { slug: string }) => c.slug));

const outputs = fs.readdirSync(dir).filter((f) => /\.(haiku|sonnet|opus)\.json$/.test(f));
for (const file of outputs) {
  const key = file.replace(/\.(haiku|sonnet|opus)\.json$/, "");
  const model = file.match(/\.(haiku|sonnet|opus)\.json$/)?.[1];
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const out = read(file);
  const input = read(`${key}.input.json`);
  const sourcesFile = path.join(dir, `${key}.sources.json`);
  const sources = fs.existsSync(sourcesFile) ? fs.readFileSync(sourcesFile, "utf8") : "";
  const sourceText = `${sources}\n${JSON.stringify(input.supplierRows)}`;
  const trustedText = input.products
    .map(
      (p: {
        current: { namePl: string };
        variants: { optionValue: string | null; sku: string }[];
      }) =>
        [p.current.namePl, ...p.variants.map((v) => `${v.optionValue ?? ""} ${v.sku}`)].join("\n"),
    )
    .join("\n");

  const problems: (Problem & { productId?: string })[] = [];
  for (const product of out.products ?? []) {
    for (const p of checkProduct(product, sourceText, trustedText, categorySlugs)) {
      problems.push({ productId: product.id, ...p });
    }
  }
  for (const e of out.eans ?? []) {
    if (!isValidGtin(e.ean)) problems.push({ field: "eans", type: "bad-ean", text: e.ean });
    else if (!sourceText.includes(e.ean))
      problems.push({ field: "eans", type: "unsourced-ean", text: e.ean });
  }
  fs.writeFileSync(path.join(dir, `${key}.${model}.check.json`), JSON.stringify(problems, null, 1));
  const byType = problems.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`${key} [${model}] ${problems.length ? JSON.stringify(byType) : "ok"}`);
}
