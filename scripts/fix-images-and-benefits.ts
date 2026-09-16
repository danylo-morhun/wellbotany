import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixProduct(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: true }
  });

  if (!product) return null;

  // Fix duplicates — keep only main image (isMain=true) + max 1 extra
  const mainImages = product.images.filter(img => img.isMain);
  const otherImages = product.images.filter(img => !img.isMain);

  if (otherImages.length > 1) {
    const toDelete = otherImages.slice(1);
    for (const img of toDelete) {
      await prisma.productImage.delete({ where: { id: img.id } });
    }
  }

  // Extract benefits from description if missing
  if (!product.benefitsPl || (Array.isArray(product.benefitsPl) && product.benefitsPl.length === 0)) {
    const descText = product.descriptionPl || "";
    
    // Try to extract from <li> tags in HTML
    const liMatches = descText.match(/<li>([^<]+)<\/li>/g);
    if (liMatches && liMatches.length > 0) {
      const benefits = liMatches
        .map(li => li.replace(/<\/?li>/g, "").trim())
        .filter(b => b.length > 10)
        .slice(0, 6);

      if (benefits.length > 0) {
        await prisma.product.update({
          where: { id: product.id },
          data: { benefitsPl: benefits }
        });

        return { fixed: true, benefits: benefits.length };
      }
    }
  }

  return { fixed: false };
}

async function main() {
  console.log("Getting products with issues...");

  const issues = await prisma.product.findMany({
    where: {
      brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } }
    },
    include: { images: true },
    orderBy: { namePl: "asc" }
  });

  let fixedImages = 0;
  let fixedBenefits = 0;

  for (const p of issues) {
    // Fix images
    const mainCount = p.images.filter(img => img.isMain).length;
    const totalCount = p.images.length;

    if (totalCount > 2) {
      const result = await fixProduct(p.slug);
      if (result?.fixed) {
        fixedBenefits++;
        console.log(`✓ ${p.namePl} — added ${result.benefits} benefits from desc`);
      }
      fixedImages++;
    }

    if ((fixedImages + fixedBenefits) % 20 === 0) {
      console.log(`  ...processed ${fixedImages + fixedBenefits}`);
    }
  }

  console.log(`\n✓ Fixed image duplicates: ${fixedImages}`);
  console.log(`✓ Fixed benefits: ${fixedBenefits}`);

  await prisma.$disconnect();
}

main().catch(console.error);
