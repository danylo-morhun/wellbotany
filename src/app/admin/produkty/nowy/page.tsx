import type { Metadata } from "next";
import { PageHeader } from "@/app/admin/components/ui";
import { ProductForm } from "@/features/products/components/ProductForm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Nowy produkt" };

export default async function AdminNewProductPage() {
  const [categories, brands, tags] = await Promise.all([
    prisma.category.findMany({ orderBy: { namePl: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader back={{ href: "/admin/produkty", label: "Produkty" }} title="Nowy produkt" />
      <ProductForm categories={categories} brands={brands} tags={tags} />
    </div>
  );
}
