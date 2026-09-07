import { prisma } from "@/lib/prisma";

async function main() {
  const total = await prisma.product.count({
    where: { brand: { slug: "singularis" } },
  });

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    include: { variants: true, images: true },
    take: 5,
  });

  console.log(`✅ Total Singularis products: ${total}`);
  console.log(`\nSample (5 shown):`);
  products.forEach((p) => {
    const price = p.variants[0]?.pricePln ? `${(p.variants[0].pricePln / 100).toFixed(2)} PLN` : "no price";
    const img = p.images.length ? "✓ image" : "no image";
    console.log(`  • ${p.namePl} (${price}) ${img}`);
  });
}

main().catch(console.error).finally(() => process.exit(0));
