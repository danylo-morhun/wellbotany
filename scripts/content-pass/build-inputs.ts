// Writes one KEY.input.json per item for a brand batch — the writer/research
// agents' only view of the shop. Products that look like pack sizes of one
// formula (same brand, same name minus the pack) share one item so the writer
// can decide on a variant group.
//   DATABASE_URL=<dev> npx tsx scripts/content-pass/build-inputs.ts <brand-slug> [--limit=N]
// → data/content-pass/batches/<brand-slug>/
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

const brandSlug = process.argv[2];
const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? Infinity);
if (!brandSlug) throw new Error("Usage: build-inputs.ts <brand-slug>");

const root = path.join(__dirname, "../../data/content-pass");
const outDir = path.join(root, "batches", brandSlug);
const done = path.join(root, "done.json"); // product ids already applied
const supplierIndex = JSON.parse(
  fs.readFileSync(path.join(root, "sources/supplier-index.json"), "utf8"),
) as {
  name: string;
  ean?: string;
  sku?: string;
}[];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
/** Name minus pack size / "NOWOŚĆ" — equal keys = same formula, different pack. */
const formulaKey = (name: string) =>
  norm(name.replace(/nowość/gi, ""))
    .replace(/\b\d+([.,]\d+)?\s*(kaps\w*|kps|tabl\w*|tab|ml|g|szt\w*|sasz\w*|porcj\w*)\b/g, "")
    .replace(/\bx\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const FIELDS = [
  "namePl",
  "shortDescPl",
  "descriptionPl",
  "benefitsPl",
  "usageInstructionsPl",
  "ingredients",
  "nutritionFacts",
  "allergenInfo",
  "healthWarnings",
  "contraindicationsPl",
  "certifications",
  "responsibleEntity",
  "netWeight",
  "servingSize",
  "servingsPerContainer",
  "storageInfo",
  "countryOfOrigin",
  "ageRestriction",
  "metaTitlePl",
  "metaDescPl",
] as const;

async function main() {
  const prisma = connect();
  const skip = new Set<string>(
    fs.existsSync(done) ? JSON.parse(fs.readFileSync(done, "utf8")) : [],
  );
  const brand = await prisma.brand.findUniqueOrThrow({
    where: { slug: brandSlug },
    select: { id: true },
  });
  const products = await prisma.product.findMany({
    where: { brand: { OR: [{ id: brand.id }, { parentBrandId: brand.id }] }, status: "ACTIVE" },
    include: {
      brand: { select: { name: true, parentBrand: { select: { name: true } } } },
      category: { select: { slug: true } },
      variants: {
        select: {
          id: true,
          sku: true,
          ean: true,
          optionLabel: true,
          optionValue: true,
          pricePln: true,
          isDefault: true,
        },
      },
      images: {
        select: { id: true, url: true, variantId: true, isMain: true, altPl: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { namePl: "asc" },
  });

  const groups = new Map<string, typeof products>();
  for (const p of products.filter((p) => !skip.has(p.id))) {
    const key = `${p.brandId}|${formulaKey(p.namePl)}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  fs.mkdirSync(outDir, { recursive: true });
  let written = 0;
  for (const members of groups.values()) {
    if (written >= limit) break;
    const key = members[0].slug;
    const codes = new Set(
      members.flatMap((p) => p.variants.flatMap((v) => [v.sku, v.ean].filter(Boolean))),
    );
    const names = new Set(members.map((p) => norm(p.namePl)));
    const supplierRows = supplierIndex.filter(
      (r) => (r.ean && codes.has(r.ean)) || (r.sku && codes.has(r.sku)) || names.has(norm(r.name)),
    );
    const item = {
      key,
      isVariantGroupCandidate: members.length > 1,
      products: members.map((p) => ({
        id: p.id,
        slug: p.slug,
        brand: p.brand?.name,
        parentBrand: p.brand?.parentBrand?.name ?? null,
        currentCategory: p.category?.slug ?? null,
        current: Object.fromEntries(FIELDS.map((f) => [f, p[f]])),
        variants: p.variants,
        images: p.images,
      })),
      supplierRows,
    };
    fs.writeFileSync(path.join(outDir, `${key}.input.json`), JSON.stringify(item, null, 1));
    written++;
  }
  console.log(
    `${brandSlug}: ${written} items (${products.length} products, ${skip.size} already done) → ${outDir}`,
  );
  await prisma.$disconnect();
}

main();
