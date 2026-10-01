import type { Metadata } from "next";
import { PageHeader } from "@/app/admin/components/ui";
import { StockTable } from "@/features/products/components/StockTable";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Magazyn" };

export default async function AdminMagazynPage() {
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, trackStock: true },
    orderBy: [{ stock: "asc" }, { sku: "asc" }],
    select: {
      id: true,
      sku: true,
      stock: true,
      lowStockThreshold: true,
      optionValue: true,
      product: {
        select: {
          id: true,
          namePl: true,
          status: true,
          brand: { select: { name: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });

  const rows = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    stock: v.stock,
    lowStockThreshold: v.lowStockThreshold,
    optionValue: v.optionValue,
    productId: v.product.id,
    productName: v.product.namePl,
    productActive: v.product.status === "ACTIVE",
    brand: v.product.brand?.name ?? null,
    image: v.product.images[0]?.url ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Magazyn"
        description="Stany wariantów ze śledzeniem magazynu. Zmień liczby i zapisz wszystkie naraz."
      />
      <StockTable variants={rows} />
    </div>
  );
}
