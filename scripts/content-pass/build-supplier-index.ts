// Parses every local supplier file with the importer's own parsers into
// data/content-pass/sources/supplier-index.json — one row per supplier item
// (name, EAN, SKU, packaging, any content fields). Writers use it as a fact
// source; nothing is written to the DB.
import fs from "node:fs";
import path from "node:path";
import { parseSupplierFile } from "../../src/features/products/lib/import/parse-supplier-file";
import { SUPPLIER_SOURCES } from "../../src/features/products/lib/import/sources";

async function main() {
  const rows: unknown[] = [];
  for (const source of SUPPLIER_SOURCES) {
    if (source.kind !== "file") continue;
    try {
      const drafts = await parseSupplierFile(source);
      for (const d of drafts) {
        const { localImagePath: _img, ...rest } = d as typeof d & { localImagePath?: string };
        rows.push({ sourceFile: source.filePath, ...rest });
      }
      console.log(`${source.id}: ${drafts.length}`);
    } catch (e) {
      console.log(`${source.id}: skipped (${(e as Error).message})`);
    }
  }
  const out = path.join(__dirname, "../../data/content-pass/sources/supplier-index.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(rows, null, 1));
  console.log(`→ ${rows.length} rows`);
}

main();
