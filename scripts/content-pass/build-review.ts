// Builds the checkpoint-2 comparison page: current text vs Haiku vs Sonnet
// per pilot item, with script-check and verifier issues. Read-only.
//   npx tsx scripts/content-pass/build-review.ts data/content-pass/pilot
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2] ?? "data/content-pass/pilot";
const read = (f: string) => {
  const p = path.join(dir, f);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};

const keys = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".input.json"))
  .map((f) => f.replace(".input.json", ""));

const items = keys.map((key) => {
  const input = read(`${key}.input.json`);
  const sources = read(`${key}.sources.json`);
  return {
    key,
    before: input.products.map(
      (p: {
        id: string;
        slug: string;
        brand: string;
        currentCategory: string;
        current: object;
        images: unknown[];
      }) => ({
        id: p.id,
        slug: p.slug,
        brand: p.brand,
        category: p.currentCategory,
        ...p.current,
        images: p.images,
      }),
    ),
    sources: (sources?.sources ?? []).map((s: { id: string; url: string; tier: string }) => ({
      id: s.id,
      url: s.url,
      tier: s.tier,
    })),
    imageVerdicts: sources?.images ?? [],
    models: Object.fromEntries(
      ["haiku", "sonnet"].map((m) => [
        m,
        {
          out: read(`${key}.${m}.json`),
          check: read(`${key}.${m}.check.json`) ?? [],
          verify: read(`${key}.${m}.verify.json`),
        },
      ]),
    ),
  };
});

const template = fs.readFileSync(path.join(__dirname, "review-template.html"), "utf8");
const html = template.replace("/*__DATA__*/null", JSON.stringify(items).replace(/</g, "\\u003c"));
fs.writeFileSync(path.join(dir, "review.html"), html);
console.log(`review.html: ${items.length} items`);
