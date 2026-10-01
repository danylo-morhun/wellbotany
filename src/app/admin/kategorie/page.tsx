import type { Metadata } from "next";
import { CategoryForm } from "@/features/products/components/CategoryForm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Kategorie" };

export default async function AdminCategoriesPage() {
  const [categories, links] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.productCategory.groupBy({ by: ["categoryId"], _count: { _all: true } }),
  ]);
  const productCounts = Object.fromEntries(links.map((l) => [l.categoryId, l._count._all]));
  return <CategoryForm categories={categories} productCounts={productCounts} />;
}
