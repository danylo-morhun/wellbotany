// Applies verified writer outputs to the DB (dev branch by default):
//   DATABASE_URL=… npx tsx scripts/content-pass/apply-content.ts <dir> <model> [--dry] [--prod]
// Skips an item when its verifier verdict is "reject" or the script check
// found unsourced numbers/EANs, banned words or unknown slugs. Content fields
// are replaced (null clears unsourced legacy text); price/stock/status untouched.
import fs from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { slugify } from "../../src/lib/slugify";
import { connect } from "./db";

const [dir = "data/content-pass/pilot", model = "sonnet"] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith("--"));
const dry = process.argv.includes("--dry");

const CONTENT_FIELDS = [
  "namePl",
  "metaTitlePl",
  "metaDescPl",
  "shortDescPl",
  "descriptionPl",
  "benefitsPl",
  "nutritionFacts",
  "ingredients",
  "usageInstructionsPl",
  "servingSize",
  "servingsPerContainer",
  "netWeight",
  "storageInfo",
  "contraindicationsPl",
  "healthWarnings",
  "allergenInfo",
  "certifications",
  "responsibleEntity",
  "countryOfOrigin",
] as const;
const BLOCKING = new Set([
  "unsourced-number",
  "unsourced-ean",
  "bad-ean",
  "banned-word",
  "unknown-slug",
]);

type Out = {
  key: string;
  products: (Record<string, unknown> & {
    id: string;
    primaryCategory?: string;
    extraCategories?: string[];
    imageAlt?: string;
    optionValue?: string;
  })[];
  variantGroup: null | {
    baseProductId: string;
    optionLabel: string;
    members: { productId: string; optionValue: string }[];
  };
  eans?: { variantId: string; ean: string }[];
  images?: { imageId: string; action: "keep" | "remove" | "assign"; variantId: string | null }[];
  newImages?: { productId: string; variantId: string | null; url: string }[];
};

function readJson<T>(file: string): T | null {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : null;
}

/** Json columns take Prisma.JsonNull, not null. */
function contentData(p: Out["products"][number]): Prisma.ProductUpdateInput {
  const jsonFields = new Set([
    "benefitsPl",
    "nutritionFacts",
    "ingredients",
    "healthWarnings",
    "allergenInfo",
    "certifications",
  ]);
  const data: Record<string, unknown> = {};
  for (const f of CONTENT_FIELDS) {
    if (!(f in p)) continue;
    const v = p[f];
    data[f] = v == null && jsonFields.has(f) ? ({ __jsonNull: true } as const) : v;
  }
  return data as Prisma.ProductUpdateInput;
}

async function main() {
  const prisma = connect();
  const { Prisma: P } = await import("@prisma/client");
  const categories = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [
      c.slug,
      c.id,
    ]),
  );

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(`.${model}.json`))) {
    const key = file.slice(0, -`.${model}.json`.length);
    const out = readJson<Out>(path.join(dir, file));
    const verify = readJson<{ verdict: string }>(path.join(dir, `${key}.${model}.verify.json`));
    const check = readJson<{ type: string }[]>(path.join(dir, `${key}.${model}.check.json`)) ?? [];
    const blocking = check.filter((c) => BLOCKING.has(c.type));
    if (!out || verify?.verdict === "reject" || blocking.length > 0) {
      console.log(`SKIP ${key}: verdict=${verify?.verdict ?? "none"}, blocking=${blocking.length}`);
      continue;
    }
    const base = out.variantGroup?.baseProductId ?? out.products[0].id;
    const content = out.products.find((p) => p.id === base) ?? out.products[0];
    console.log(
      `APPLY ${key} → base ${base}${out.variantGroup ? ` (+${out.variantGroup.members.length - 1} merged)` : ""}`,
    );
    if (dry) continue;

    await prisma.$transaction(async (tx) => {
      // 1. Variant group: move the other packs' variants + photos onto the base
      if (out.variantGroup) {
        const baseProduct = await tx.product.findUniqueOrThrow({
          where: { id: base },
          select: { slug: true },
        });
        // The group's URL names no pack size ("magnez-mse-300-mg", not
        // "…-120-kaps") — it now sells every size. Keep the old one if taken.
        const wanted = slugify(String(content.namePl ?? ""));
        const taken =
          !wanted ||
          (wanted !== baseProduct.slug &&
            (await tx.product.findFirst({ where: { slug: wanted, NOT: { id: base } } })));
        const finalSlug = taken ? baseProduct.slug : wanted;
        for (const m of out.variantGroup.members) {
          const variants = await tx.productVariant.findMany({
            where: { productId: m.productId },
            select: { id: true },
          });
          await tx.productVariant.updateMany({
            where: { productId: m.productId },
            data: {
              optionLabel: out.variantGroup.optionLabel,
              optionValue: m.optionValue,
              ...(m.productId !== base && { isDefault: false }),
            },
          });
          if (m.productId === base) {
            await tx.productImage.updateMany({
              where: { productId: base, variantId: null },
              data: { variantId: variants[0]?.id },
            });
            continue;
          }
          const member = await tx.product.findUniqueOrThrow({
            where: { id: m.productId },
            select: { slug: true },
          });
          await tx.productVariant.updateMany({
            where: { productId: m.productId },
            data: { productId: base },
          });
          await tx.productImage.updateMany({
            where: { productId: m.productId },
            data: { productId: base, variantId: variants[0]?.id, isMain: false },
          });
          // Wishlist rows are unique per (wishlist, product): drop the ones that would collide
          const wl = await tx.wishlistItem.findMany({
            where: { productId: m.productId },
            select: { id: true, wishlistId: true },
          });
          for (const w of wl) {
            const clash = await tx.wishlistItem.findFirst({
              where: { wishlistId: w.wishlistId, productId: base },
            });
            if (clash) await tx.wishlistItem.delete({ where: { id: w.id } });
            else await tx.wishlistItem.update({ where: { id: w.id }, data: { productId: base } });
          }
          await tx.redirect.upsert({
            where: { fromPath: `/produkt/${member.slug}` },
            update: { toPath: `/produkt/${finalSlug}?wariant=${variants[0]?.id}` },
            create: {
              fromPath: `/produkt/${member.slug}`,
              toPath: `/produkt/${finalSlug}?wariant=${variants[0]?.id}`,
            },
          });
          await tx.product.delete({ where: { id: m.productId } });
        }
        if (finalSlug !== baseProduct.slug) {
          const baseVariant = await tx.productVariant.findFirst({
            where: { productId: base, isDefault: true },
            select: { id: true },
          });
          await tx.product.update({ where: { id: base }, data: { slug: finalSlug } });
          const toPath = `/produkt/${finalSlug}${baseVariant ? `?wariant=${baseVariant.id}` : ""}`;
          await tx.redirect.upsert({
            where: { fromPath: `/produkt/${baseProduct.slug}` },
            update: { toPath },
            create: { fromPath: `/produkt/${baseProduct.slug}`, toPath },
          });
        }
      }

      // 2. Content (JsonNull for cleared Json columns)
      const data = contentData(content) as Record<string, unknown>;
      // Pack-dependent: in a group each variant's optionValue carries it
      if (out.variantGroup) Object.assign(data, { netWeight: null, servingsPerContainer: null });
      for (const [k, v] of Object.entries(data))
        if (v && typeof v === "object" && "__jsonNull" in v) data[k] = P.JsonNull;
      const primaryId = content.primaryCategory
        ? categories.get(content.primaryCategory)
        : undefined;
      await tx.product.update({
        where: { id: base },
        data: { ...data, ...(primaryId && { categoryId: primaryId }) },
      });

      // 3. Category links = primary + extras
      if (primaryId) {
        const ids = [
          ...new Set([
            primaryId,
            ...(content.extraCategories ?? []).map((s) => categories.get(s)).filter(Boolean),
          ]),
        ] as string[];
        await tx.productCategory.deleteMany({ where: { productId: base } });
        await tx.productCategory.createMany({
          data: ids.map((categoryId) => ({ productId: base, categoryId })),
        });
      }

      // 4. EANs (unique column — skip one already used elsewhere)
      for (const e of out.eans ?? []) {
        const taken = await tx.productVariant.findFirst({
          where: { ean: e.ean, NOT: { id: e.variantId } },
        });
        if (taken) console.log(`  ean ${e.ean} already on variant ${taken.id} — skipped`);
        else await tx.productVariant.update({ where: { id: e.variantId }, data: { ean: e.ean } });
      }

      // 5. Photos: remove wrong ones, pin pack photos to their variant, alt text
      for (const img of out.images ?? []) {
        if (img.action === "remove")
          await tx.productImage.deleteMany({ where: { id: img.imageId, productId: base } });
        if (img.action === "assign")
          await tx.productImage.updateMany({
            where: { id: img.imageId, productId: base },
            data: { variantId: img.variantId },
          });
      }
      if (content.imageAlt)
        await tx.productImage.updateMany({
          where: { productId: base },
          data: { altPl: content.imageAlt },
        });
      if ((out.newImages ?? []).length)
        console.log(`  ${out.newImages?.length} official photo(s) to upload later`);

      // Exactly one main image, preferring the default variant's photo
      const imgs = await tx.productImage.findMany({
        where: { productId: base },
        orderBy: { sortOrder: "asc" },
        select: { id: true, variantId: true },
      });
      const defaultVariant = await tx.productVariant.findFirst({
        where: { productId: base },
        orderBy: { isDefault: "desc" },
        select: { id: true },
      });
      const main = imgs.find((i) => i.variantId === defaultVariant?.id) ?? imgs[0];
      if (main) {
        await tx.productImage.updateMany({ where: { productId: base }, data: { isMain: false } });
        await tx.productImage.update({ where: { id: main.id }, data: { isMain: true } });
      }
      // A merged group needs exactly one default variant
      if (out.variantGroup && defaultVariant) {
        await tx.productVariant.updateMany({
          where: { productId: base, NOT: { id: defaultVariant.id } },
          data: { isDefault: false },
        });
        await tx.productVariant.update({
          where: { id: defaultVariant.id },
          data: { isDefault: true },
        });
      }
    });
  }
  await prisma.$disconnect();
}

main();
