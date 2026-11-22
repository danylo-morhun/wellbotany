// Creates supplement products from one prepared JSON file (texts, composition
// rows, regulatory fields, price) — used for the Norsan / Norsa Pharma import:
//   DATABASE_URL=… npx tsx --env-file=.env.local scripts/content-pass/apply-supplements.ts <products.json> [--dry] [--prod]
// Images are local files next to the JSON (img/<file>), uploaded to Cloudinary.
// Skips products whose EAN or SKU already exists. Progress is kept in
// applied-<db name>.json next to the JSON so a rerun resumes.
import fs from "node:fs";
import path from "node:path";
import { slugify } from "../../src/lib/slugify";
import { connect } from "./db";

const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!file) throw new Error("usage: apply-supplements.ts <products.json> [--dry] [--prod]");
const dry = process.argv.includes("--dry");
const dir = path.dirname(file);
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

type Row = { name: string; amount: string; rws?: string };
/** Flavour variants of one card: each has its own EAN (= SKU) and price. */
type Variant = {
  ean: string | null;
  optionValue: string;
  image: string | null;
  costNet: number | null;
  vat: number;
  pricePln: number;
};
/** ean null = barcode not confirmed (product not in Subiekt); sku is then required. */
type Item = {
  ean: string | null;
  sku?: string;
  slug?: string;
  brand: string;
  status: "ACTIVE" | "DRAFT";
  namePl: string;
  metaTitlePl: string;
  metaDescPl: string;
  shortDescPl: string;
  descriptionPl: string;
  benefitsPl: string[];
  category: string;
  extraCategories: string[];
  netWeight: string | null;
  servingSize: string | null;
  servingsPerContainer: number | null;
  storageInfo: string | null;
  usageInstructionsPl: string | null;
  ingredientsPl: string;
  nutritionFacts: Row[];
  healthWarnings: string[];
  contraindicationsPl: string | null;
  ageRestriction: number | null;
  allergens: string[];
  certifications: string[];
  responsibleEntity: string;
  image: string | null;
  costNet: number | null;
  vat: number;
  pricePln: number;
  optionLabel?: string;
  variants?: Variant[];
};

/** New categories: slug → [name, parent slug]. */
const NEW_CATEGORIES: Record<string, [string, string]> = {
  nukleotydy: ["Nukleotydy", "aminokwasy-i-bialko"],
};

async function uploadImage(local: string, publicId: string): Promise<string> {
  if (!CLOUD || !PRESET)
    throw new Error("NEXT_PUBLIC_CLOUDINARY_* missing (use --env-file=.env.local)");
  const body = new FormData();
  body.set("file", new Blob([fs.readFileSync(local)]), path.basename(local));
  body.set("upload_preset", PRESET);
  body.set("folder", "products/norsa");
  body.set("public_id", publicId);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: "POST",
    body,
  });
  const json = (await res.json()) as { secure_url?: string; error?: { message: string } };
  if (!json.secure_url) throw new Error(`Cloudinary: ${json.error?.message ?? res.status}`);
  return json.secure_url;
}

async function main() {
  const items = JSON.parse(fs.readFileSync(file as string, "utf8")) as Item[];
  const db = connect();
  const dbName = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1) || "db";
  const stateFile = path.join(dir, `applied-${dbName}.json`);
  const state: Record<string, string> = fs.existsSync(stateFile)
    ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
    : {};

  const slugs = [...new Set(items.flatMap((it) => [it.category, ...it.extraCategories]))];
  const catId: Record<string, string> = {};
  for (const slug of slugs) {
    const c = await db.category.findUnique({ where: { slug } });
    if (c) {
      catId[slug] = c.id;
      continue;
    }
    const spec = NEW_CATEGORIES[slug];
    if (!spec) throw new Error(`unknown category ${slug}`);
    const parent = await db.category.findUnique({ where: { slug: spec[1] } });
    if (!parent) throw new Error(`parent category ${spec[1]} missing`);
    console.log(`category + ${slug} under ${spec[1]}`);
    if (!dry) {
      const max = await db.category.aggregate({
        where: { parentId: parent.id },
        _max: { sortOrder: true },
      });
      const row = await db.category.create({
        data: {
          slug,
          namePl: spec[0],
          parentId: parent.id,
          group: parent.group,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
        },
      });
      catId[slug] = row.id;
    }
  }

  const brandId: Record<string, string> = {};
  for (const it of items) {
    const sku = it.sku ?? it.ean;
    if (!sku) throw new Error(`${it.namePl}: needs ean or sku`);
    const key = it.ean ?? sku;
    if (state[key]) continue;
    const variants: Variant[] = it.variants ?? [
      {
        ean: it.ean,
        optionValue: "",
        image: it.image,
        costNet: it.costNet,
        vat: it.vat,
        pricePln: it.pricePln,
      },
    ];
    const codes = [...new Set([sku, ...variants.map((v) => v.ean)])].filter(
      (c): c is string => !!c,
    );
    if (
      await db.productVariant.findFirst({
        where: { OR: [{ ean: { in: codes } }, { sku: { in: codes } }] },
      })
    ) {
      console.log(`skip ${key} — EAN/SKU exists`);
      continue;
    }
    const categories = [it.category, ...it.extraCategories].filter((s, i, a) => a.indexOf(s) === i);
    const base = it.slug ?? slugify(`${it.namePl.split(",")[0]} ${it.brand}`);
    let slug = base;
    for (let n = 2; await db.product.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;

    if (dry) {
      console.log(
        `would create ${it.status} ${slug} ${variants.map((v) => `${v.optionValue || v.ean}:${v.pricePln}`).join("/")} [${categories.join(",")}] rows:${it.nutritionFacts.length} img:${it.image ?? "-"}`,
      );
      continue;
    }

    if (!brandId[it.brand]) {
      const bslug = slugify(it.brand);
      const b =
        (await db.brand.findUnique({ where: { slug: bslug } })) ??
        (await db.brand.create({ data: { slug: bslug, name: it.brand } }));
      brandId[it.brand] = b.id;
    }

    const product = await db.product.create({
      data: {
        slug,
        status: it.status,
        namePl: it.namePl,
        shortDescPl: it.shortDescPl,
        descriptionPl: it.descriptionPl,
        benefitsPl: it.benefitsPl,
        metaTitlePl: it.metaTitlePl,
        metaDescPl: it.metaDescPl,
        brandId: brandId[it.brand],
        categoryId: catId[it.category],
        categoryLinks: { create: categories.map((s) => ({ categoryId: catId[s] })) },
        netWeight: it.netWeight,
        servingSize: it.servingSize,
        servingsPerContainer: it.servingsPerContainer,
        storageInfo: it.storageInfo,
        usageInstructionsPl: it.usageInstructionsPl,
        ingredients: { pl: it.ingredientsPl },
        nutritionFacts: it.nutritionFacts,
        ...(it.allergens.length && { allergenInfo: { contains: it.allergens, mayContain: [] } }),
        healthWarnings: it.healthWarnings,
        contraindicationsPl: it.contraindicationsPl,
        ageRestriction: it.ageRestriction,
        certifications: it.certifications,
        responsibleEntity: it.responsibleEntity,
        variants: {
          create: variants.map((v, i) => ({
            sku: (it.variants && v.ean) || sku,
            ean: v.ean,
            ...(it.variants && { optionLabel: it.optionLabel, optionValue: v.optionValue }),
            pricePln: v.pricePln,
            costPricePln: v.costNet,
            vatRate: v.vat,
            stock: 10,
            trackStock: false,
            isDefault: i === 0,
          })),
        },
      },
      include: { variants: true },
    });
    // One image per variant that has a photo; with flavour variants the photo
    // is tied to its variant. The first uploaded image is the main one.
    let sortOrder = 0;
    for (const v of variants) {
      if (!v.image) continue;
      const vsku = (it.variants && v.ean) || sku;
      const url = await uploadImage(path.join(dir, "img", v.image), vsku);
      await db.productImage.create({
        data: {
          productId: product.id,
          variantId: it.variants ? product.variants.find((pv) => pv.ean === v.ean)?.id : null,
          url,
          altPl: `${it.brand} ${it.namePl}${v.optionValue ? `, ${it.optionLabel?.toLowerCase()} ${v.optionValue}` : ""}`,
          sortOrder,
          isMain: sortOrder === 0,
        },
      });
      sortOrder++;
    }
    state[key] = product.id;
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 1));
    console.log(`+ ${key} ${it.status} ${slug}`);
  }
  console.log(`done: ${Object.keys(state).length} applied on ${dbName}${dry ? " (dry)" : ""}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
