// Creates Bioplanet snack products as DRAFT from parsed items + writer outputs:
//   DATABASE_URL=… npx tsx scripts/content-pass/apply-bioplanet.ts <workDir> [--dry] [--prod]
// <workDir>/items/<bpId>.json = supplier facts, <workDir>/out/<bpId>.json = texts.
// <workDir>/groups.json lists ids that are one product in several pack sizes —
// the first id gives the text, each id becomes a "Waga" variant.
// Skips items whose EAN already exists. Images go to Cloudinary (unsigned preset).
// Progress is kept in <workDir>/applied-<db host>.json so a rerun resumes.
import fs from "node:fs";
import path from "node:path";
import { slugify } from "../../src/lib/slugify";
import { connect } from "./db";

const dir = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!dir) throw new Error("usage: apply-bioplanet.ts <workDir> [--dry] [--prod]");
const dry = process.argv.includes("--dry");
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

type Item = {
  bpId: string;
  ean: string;
  brand: string;
  netWeightRaw: string;
  vat: number;
  costNet: number;
  pricePln: number;
  inStock: boolean;
  images: string[];
  attributes: string[];
  responsibleEntity: string | null;
  countryOfOrigin: string | null;
  sourceName: string;
  sections: Record<string, string>;
};
type Out = {
  bpId: string;
  namePl: string;
  metaTitlePl: string;
  metaDescPl: string;
  shortDescPl: string;
  descriptionPl: string;
  benefitsPl: string[];
  primaryCategory: string;
  extraCategories: string[];
};

const NEW_CATEGORIES = [
  { slug: "czekolady-i-czekoladki", namePl: "Czekolady i czekoladki" },
  { slug: "ciastka-i-wafle", namePl: "Ciastka i wafle" },
  { slug: "chipsy-i-przekaski-slone", namePl: "Chipsy i przekąski słone" },
  { slug: "przekaski-owocowe", namePl: "Przekąski owocowe" },
  { slug: "slodycze", namePl: "Żelki, krówki i inne słodycze" },
];

const SUPPLEMENT_WARNINGS = [
  "Suplement diety nie może być stosowany jako substytut (zamiennik) zróżnicowanej diety.",
  "Zróżnicowana dieta i zdrowy tryb życia są ważne dla funkcjonowania organizmu.",
  "Nie przekraczać zalecanej porcji do spożycia w ciągu dnia.",
  "Przechowywać w miejscu niedostępnym dla małych dzieci.",
];

/** Supplier "UWAGA" lines worth showing; nutrition/gluten slogans are dropped. */
function warnings(it: Item): string[] {
  const lines = (it.sections.note ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^(wysoka zawartość|bez dodatku|produkt bezglutenowy)/i.test(l));
  if (/suplement diety/i.test(it.sections.opis ?? "")) lines.push(...SUPPLEMENT_WARNINGS);
  return lines;
}

/** Drops the pack weight from a grouped product's titles ("… BIO 150 g" → "… BIO"). */
const stripWeight = (s: string, w: string) =>
  s.replace(new RegExp(`,?\\s*${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"), "").trim();

const read = <T>(f: string): T => JSON.parse(fs.readFileSync(f, "utf8")) as T;

/** "Może zawierać ORZECHY." → mayContain; anything else is returned as unknown. */
function allergens(text: string | undefined) {
  if (!text) return null;
  const may: string[] = [];
  const unknown: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim().replace(/\.$/, "");
    if (!line) continue;
    const m =
      line.match(/^(?:produkt\s+)?może\s+zawierać:?\s+(.+)$/i) ??
      line.match(/^wyprodukowano\s+w\s+zakładzie\s+(?:wykorzystującym|przetwarzającym)\s+(.+)$/i);
    if (m) may.push(m[1].trim());
    else unknown.push(line);
  }
  return { may, unknown };
}

function certifications(it: Item): string[] {
  const a = new Set(it.attributes);
  const name = it.sourceName.toUpperCase();
  const out: string[] = [];
  if (a.has("CERTYFIKAT BIO") || /\bBIO\b/.test(name.split(" - ")[0])) out.push("BIO");
  if (a.has("WEGAŃSKI")) out.push("Wegański");
  if (/BEZGLUTENOW/.test(name) || a.has("BEZ GLUTENU (deklaracja)")) out.push("Bezglutenowy");
  if (/BEZ DODATKU CUKRÓW/.test(name)) out.push("Bez dodatku cukrów");
  if (/FAIR TRADE/.test(name)) out.push("Fair Trade");
  return out;
}

async function uploadImage(url: string, publicId: string): Promise<string> {
  if (!CLOUD || !PRESET)
    throw new Error("NEXT_PUBLIC_CLOUDINARY_* missing (use --env-file=.env.local)");
  const body = new FormData();
  body.set("file", url);
  body.set("upload_preset", PRESET);
  body.set("folder", "products/bioplanet");
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
  const db = connect();
  const host = (process.env.DATABASE_URL ?? "").split("@")[1]?.split(".")[0] ?? "db";
  const stateFile = path.join(dir as string, `applied-${host}.json`);
  const state: Record<string, string> = fs.existsSync(stateFile) ? read(stateFile) : {};
  const report: string[] = [];

  // Categories: reuse existing slugs, create the rest under "zywnosc".
  const parent = await db.category.findUnique({ where: { slug: "zywnosc" } });
  if (!parent) throw new Error('category "zywnosc" missing');
  const catId: Record<string, string> = {};
  for (const slug of [
    "batony",
    "dla-dzieci",
    "dla-sportowcow",
    ...NEW_CATEGORIES.map((c) => c.slug),
  ]) {
    const c = await db.category.findUnique({ where: { slug } });
    if (c) catId[slug] = c.id;
  }
  let sort = 92;
  for (const c of NEW_CATEGORIES) {
    if (catId[c.slug]) continue;
    report.push(`category + ${c.slug}`);
    if (!dry) {
      const row = await db.category.create({
        data: { ...c, parentId: parent.id, group: "OTHER", sortOrder: sort++ },
      });
      catId[c.slug] = row.id;
    }
  }

  const groupsFile = path.join(dir as string, "groups.json");
  const groups: string[][] = fs.existsSync(groupsFile) ? read(groupsFile) : [];
  const grouped = new Set(groups.flatMap((g) => g.slice(1)));
  const membersOf = (id: string) => groups.find((g) => g[0] === id) ?? [id];
  const ids = fs
    .readdirSync(path.join(dir as string, "out"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .filter((id) => !grouped.has(id));
  const brandId: Record<string, string> = {};

  for (const id of ids) {
    if (state[id]) continue;
    const members = membersOf(id).map((m) =>
      read<Item>(path.join(dir as string, "items", `${m}.json`)),
    );
    const it = members[0];
    const out = read<Out>(path.join(dir as string, "out", `${id}.json`));
    if (members.length > 1) {
      for (const k of ["namePl", "metaTitlePl", "metaDescPl", "shortDescPl"] as const) {
        out[k] = stripWeight(out[k], it.netWeightRaw);
      }
    }

    const eans = members.map((m) => m.ean);
    if (
      await db.productVariant.findFirst({
        where: { OR: [{ ean: { in: eans } }, { sku: { in: eans } }] },
      })
    ) {
      report.push(`skip ${id} — EAN ${eans.join(",")} exists`);
      continue;
    }

    const al = allergens(it.sections.allergens);
    if (al?.unknown.length)
      report.push(`allergen text not parsed ${id}: ${al.unknown.join(" / ")}`);

    const categories = [out.primaryCategory, ...out.extraCategories].filter(
      (s, i, a) => a.indexOf(s) === i,
    );
    const missing = categories.filter((s) => !catId[s] && !dry);
    if (missing.length) throw new Error(`${id}: unknown category ${missing.join(",")}`);

    let slug = slugify(`${out.namePl} ${it.brand}`);
    for (let n = 2; await db.product.findUnique({ where: { slug } }); n++) {
      slug = `${slugify(`${out.namePl} ${it.brand}`)}-${n}`;
    }

    if (dry) {
      report.push(
        `would create ${id} ${slug} ${members.map((m) => `${m.netWeightRaw}=${m.pricePln}`).join(" ")} [${categories.join(",")}] warn:${warnings(it).length}`,
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

    // One upload per supplier photo, tagged with its variant's EAN
    const photos: { url: string; ean: string }[] = [];
    for (const m of members) {
      for (const [i, src] of m.images.entries()) {
        photos.push({ url: await uploadImage(src, i === 0 ? m.ean : `${m.ean}-${i}`), ean: m.ean });
      }
    }

    const product = await db.product.create({
      data: {
        slug,
        status: "DRAFT",
        namePl: out.namePl,
        shortDescPl: out.shortDescPl,
        descriptionPl: out.descriptionPl,
        benefitsPl: out.benefitsPl,
        metaTitlePl: out.metaTitlePl,
        metaDescPl: out.metaDescPl,
        brandId: brandId[it.brand],
        categoryId: catId[out.primaryCategory],
        categoryLinks: { create: categories.map((s) => ({ categoryId: catId[s] })) },
        netWeight: members.length > 1 ? null : it.netWeightRaw,
        storageInfo: it.sections.storage ?? null,
        countryOfOrigin: it.countryOfOrigin,
        responsibleEntity: it.responsibleEntity,
        ingredients: { pl: it.sections.ingredients },
        ...(it.sections.nutrition && { nutritionFacts: { pl: it.sections.nutrition } }),
        ...(al?.may.length && { allergenInfo: { contains: [], mayContain: al.may } }),
        certifications: certifications(it),
        usageInstructionsPl: it.sections.usage ?? null,
        healthWarnings: warnings(it),
        variants: {
          create: members.map((m) => ({
            sku: m.ean,
            ean: m.ean,
            optionLabel: "Waga",
            optionValue: m.netWeightRaw,
            pricePln: m.pricePln,
            costPricePln: Math.round(m.costNet * 100),
            vatRate: m.vat,
            stock: m.inStock ? 10 : 0,
          })),
        },
      },
      include: { variants: true },
    });
    const variantByEan = Object.fromEntries(product.variants.map((v) => [v.ean, v.id]));
    await db.productImage.createMany({
      data: photos.map((ph, i) => ({
        productId: product.id,
        variantId: members.length > 1 ? variantByEan[ph.ean] : null,
        url: ph.url,
        altPl: `${it.brand} ${out.namePl}${members.length > 1 ? ` ${members.find((m) => m.ean === ph.ean)?.netWeightRaw}` : ""}`,
        sortOrder: i,
        isMain: i === 0,
      })),
    });
    state[id] = product.id;
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 1));
    console.log(`+ ${id} ${slug}`);
  }

  console.log(report.join("\n"));
  console.log(`done: ${Object.keys(state).length} applied on ${host}${dry ? " (dry)" : ""}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
