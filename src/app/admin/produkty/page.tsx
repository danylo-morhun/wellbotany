import Link from "next/link";
import { Suspense } from "react";
import { AdminPagination } from "@/app/admin/components/AdminPagination";
import { AdminSearch } from "@/app/admin/components/AdminSearch";
import { ProductsTable } from "@/features/products/components/ProductsTable";
import { buildProductWhere } from "@/features/products/lib/where";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

type SearchParams = { szukaj?: string; strona?: string };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.strona ?? "1", 10));
  const search = params.szukaj ?? "";
  const where = buildProductWhere(search);

  const [products, total, brands, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        namePl: true,
        slug: true,
        status: true,
        category: { select: { namePl: true } },
        brand: { select: { name: true } },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { id: true, namePl: true }, orderBy: { namePl: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produkty</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/produkty/import"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            Import z cenników
          </Link>
          <Link
            href="/admin/produkty/nowy"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
          >
            + Dodaj produkt
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <Suspense>
          <AdminSearch placeholder="Szukaj produktów…" />
        </Suspense>
      </div>

      <ProductsTable
        products={products}
        total={total}
        search={search}
        brands={brands}
        categories={categories}
      />

      <div className="flex items-center justify-between pt-4">
        <p className="text-xs text-muted-foreground">
          {total} {total === 1 ? "produkt" : "produktów"}
        </p>
        <Suspense>
          <AdminPagination currentPage={page} totalPages={totalPages} />
        </Suspense>
      </div>
    </div>
  );
}
