import type { ProductStatus } from "@prisma/client";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPagination } from "@/app/admin/components/AdminPagination";
import { AdminProductFilters } from "@/app/admin/components/AdminProductFilters";
import { AdminSearch } from "@/app/admin/components/AdminSearch";
import { ProductsTable } from "@/features/products/components/ProductsTable";
import { buildProductWhere, type ProductFilters } from "@/features/products/lib/where";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;
const NONE_VALUE = "__brak__";
const STATUS_VALUES: ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

type SearchParams = {
  szukaj?: string;
  strona?: string;
  status?: string;
  marka?: string;
  kategoria?: string;
  zdjecie?: string;
};

function parseFilters(params: SearchParams): ProductFilters {
  const status = STATUS_VALUES.includes(params.status as ProductStatus)
    ? (params.status as ProductStatus)
    : undefined;

  return {
    search: params.szukaj || undefined,
    status,
    noBrand: params.marka === NONE_VALUE,
    brandId: params.marka && params.marka !== NONE_VALUE ? params.marka : undefined,
    noCategory: params.kategoria === NONE_VALUE,
    categoryId: params.kategoria && params.kategoria !== NONE_VALUE ? params.kategoria : undefined,
    noImage: params.zdjecie === NONE_VALUE,
  };
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.strona ?? "1", 10));
  const filters = parseFilters(params);
  const where = buildProductWhere(filters);

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
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Suspense>
          <AdminSearch placeholder="Szukaj produktów…" />
        </Suspense>
        <Suspense>
          <AdminProductFilters brands={brands} categories={categories} />
        </Suspense>
      </div>

      <ProductsTable
        products={products}
        total={total}
        filters={filters}
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
