import type { Metadata } from "next";
import { BrandForm } from "@/features/products/components/BrandForm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Marki" };

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <BrandForm
      brands={brands.map(({ _count, ...b }) => ({ ...b, productCount: _count.products }))}
    />
  );
}
