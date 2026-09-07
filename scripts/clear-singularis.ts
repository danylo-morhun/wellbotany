import { prisma } from "@/lib/prisma";

async function main() {
  const count = await prisma.product.deleteMany({
    where: { brand: { slug: "singularis" } },
  });
  console.log(`Deleted ${count.count} Singularis products`);

  // Also delete brand if it has no products
  const brand = await prisma.brand.findUnique({ where: { slug: "singularis" } });
  if (brand) {
    await prisma.brand.delete({ where: { id: brand.id } });
    console.log("Deleted Singularis brand");
  }
}

main().catch(console.error).finally(() => process.exit(0));
