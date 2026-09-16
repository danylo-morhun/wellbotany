import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";

const prisma = new PrismaClient();

interface Reformat {
  id: string;
  slug: string;
  shortDescPl: string;
  descriptionPl: string;
  benefitsPl: string[] | null;
}

async function applyReformats() {
  console.log("Loading reformats...");

  // Load manually done (3)
  const manualFile = await fs.readFile(
    "/Users/danylomorhun/Projects/zielarnia/scripts/manual-reformat-batch.ts",
    "utf-8"
  );

  // Load smart-generated (164)
  const smartJson = JSON.parse(
    await fs.readFile("/tmp/reformatted-smart-all.json", "utf-8")
  );

  console.log(`Applying ${smartJson.length} smart reformats + 3 manual...`);

  let applied = 0;
  let errors = 0;

  for (const reformat of smartJson) {
    try {
      await prisma.product.update({
        where: { id: reformat.id },
        data: {
          shortDescPl: reformat.shortDescPl,
          descriptionPl: reformat.descriptionPl,
          ...(reformat.benefitsPl && { benefitsPl: reformat.benefitsPl }),
        },
      });
      applied++;

      if (applied % 50 === 0) {
        console.log(`  ${applied}/${smartJson.length}...`);
      }
    } catch (err) {
      console.error(`✗ ${reformat.slug}: ${err}`);
      errors++;
    }
  }

  console.log(`\n✓ Applied smart: ${applied}`);
  console.log(`✗ Errors: ${errors}`);
  console.log(`✓ Manual (already done): 3`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✓ TOTAL: ${applied + 3}/167`);

  await prisma.$disconnect();
}

applyReformats().catch(console.error);
