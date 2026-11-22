// Creates gift sets (GiftSet) from producer sets — used for the Norsan / Norsa Pharma import:
//   DATABASE_URL=… npx tsx --env-file=.env.local scripts/content-pass/apply-gift-sets.ts <sets.json> [--dry] [--prod]
// Components are looked up by variant SKU. Price = producer set price, raised to the
// 30 % margin floor when all component costs are known, capped at the sum of the
// singles. comparePricePln = sum of the singles, only when the set is cheaper.
// Images: raw/sets/<slug>.png next to the JSON, uploaded to Cloudinary.
// Skips sets whose slug already exists.
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!file) throw new Error("usage: apply-gift-sets.ts <sets.json> [--dry] [--prod]");
const dry = process.argv.includes("--dry");
const dir = path.dirname(file);
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const MARGIN = 0.3;

type SetSpec = {
  slug: string;
  namePl: string;
  descriptionPl: string;
  producerPrice: number;
  items: [string, number][];
};

async function uploadImage(local: string, publicId: string): Promise<string> {
  if (!CLOUD || !PRESET)
    throw new Error("NEXT_PUBLIC_CLOUDINARY_* missing (use --env-file=.env.local)");
  const body = new FormData();
  body.set("file", new Blob([fs.readFileSync(local)]), path.basename(local));
  body.set("upload_preset", PRESET);
  body.set("folder", "gift-sets/norsa");
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
  const sets = JSON.parse(fs.readFileSync(file as string, "utf8")) as SetSpec[];
  const db = connect();
  let created = 0;
  for (const s of sets) {
    if (await db.giftSet.findUnique({ where: { slug: s.slug } })) {
      console.log(`skip ${s.slug} — exists`);
      continue;
    }
    const parts = [];
    for (const [sku, quantity] of s.items) {
      const v = await db.productVariant.findUnique({ where: { sku } });
      if (!v) throw new Error(`${s.slug}: variant ${sku} missing`);
      parts.push({ v, quantity });
    }
    const singles = parts.reduce((sum, p) => sum + p.v.pricePln * p.quantity, 0);
    const costKnown = parts.every((p) => p.v.costPricePln != null);
    // Gross floor: net cost / (1 − margin) × (1 + VAT), per component
    const floor = costKnown
      ? parts.reduce(
          (sum, p) =>
            sum +
            Math.ceil(
              ((p.v.costPricePln as number) * (100 + Number(p.v.vatRate))) / (100 * (1 - MARGIN)),
            ) *
              p.quantity,
          0,
        )
      : 0;
    const price = Math.min(singles, Math.max(s.producerPrice, floor));
    const compare = singles > price ? singles : null;
    const note = [
      price > s.producerPrice ? `raised from ${s.producerPrice} (30 % floor)` : "",
      costKnown ? "" : "cost unknown",
    ]
      .filter(Boolean)
      .join(", ");
    console.log(
      `${dry ? "would create" : "+"} ${s.slug} ${price}${compare ? ` (was ${compare})` : ""} ${note}`,
    );
    if (dry) continue;

    const img = path.join(dir, "raw", "sets", `${s.slug}.png`);
    const imageUrl = fs.existsSync(img) ? await uploadImage(img, s.slug) : null;
    await db.giftSet.create({
      data: {
        slug: s.slug,
        status: "ACTIVE",
        namePl: s.namePl,
        descriptionPl: s.descriptionPl,
        imageUrl,
        pricePln: price,
        comparePricePln: compare,
        items: { create: parts.map((p) => ({ variantId: p.v.id, quantity: p.quantity })) },
      },
    });
    created++;
  }
  console.log(`done: ${created} created${dry ? " (dry)" : ""}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
