import { prisma } from "@/lib/prisma";

async function main() {
  const brands = await prisma.brand.findMany({
    where: { name: { contains: "singularis", mode: "insensitive" } },
  });

  console.log("Brands matching 'singularis':");
  brands.forEach((b) => console.log(`  - ${b.name} (${b.slug})`));

  const recentProducts = await prisma.product.findMany({
    include: { brand: true, images: true, variants: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(`\nLast 10 products created:`);
  recentProducts.forEach((p) => {
    const price = p.variants[0]?.pricePln ? `${(p.variants[0].pricePln / 100).toFixed(2)} PLN` : "—";
    console.log(`  • ${p.namePl} | ${p.brand?.name ?? "no brand"} | ${price} | images: ${p.images.length}`);
  });

  const total = await prisma.product.count();
  console.log(`\n✅ Total products in DB: ${total}`);
}

main().catch(console.error).finally(() => process.exit(0));
