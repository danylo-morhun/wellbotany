// Writes brand descriptions / country codes from
// data/content-pass/categories/brands.json. Dry run by default.
//   DATABASE_URL=… npx tsx scripts/content-pass/apply-brand-content.ts [--apply] [--prod]
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

const FILE = path.join(__dirname, "../../data/content-pass/categories/brands.json");
const apply = process.argv.includes("--apply");

async function main() {
  const prisma = connect();
  const entries = Object.entries(
    JSON.parse(fs.readFileSync(FILE, "utf8")) as Record<
      string,
      { description: string; countryCode?: string }
    >,
  );
  for (const [slug, data] of entries) {
    const brand = await prisma.brand.findUnique({ where: { slug }, select: { id: true } });
    if (!brand) throw new Error(`unknown brand ${slug}`);
    if (apply) await prisma.brand.update({ where: { slug }, data });
  }
  console.log(`${apply ? "Applied" : "Checked"} ${entries.length} brands`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
