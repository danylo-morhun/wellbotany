import type { ProductStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPagination } from "@/app/admin/components/AdminPagination";
import { AdminProductFilters } from "@/app/admin/components/AdminProductFilters";
import { AdminSearch } from "@/app/admin/components/AdminSearch";
import { PageHeader } from "@/app/admin/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { toBrandOptions } from "@/features/catalog/lib/brand-tree";
import { rankBySearchRelevance } from "@/features/catalog/lib/search-relevance";
import { ProductsTable } from "@/features/products/components/ProductsTable";
import { productCompleteness } from "@/features/products/lib/completeness";
import { buildProductWhere, type ProductFilters } from "@/features/products/lib/where";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Produkty" };

const PAGE_SIZE = 25;
const NONE_VALUE = "__brak__";
const STATUS_VALUES: ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];
// Generous cap for fuzzy-ranking candidates when searching — well above this
// catalog's size, so recall never silently truncates.
const SEARCH_CANDIDATE_CAP = 2000;

const ADMIN_PRODUCT_SELECT = {
  id: true,
  namePl: true,
  slug: true,
  status: true,
  category: { select: { namePl: true } },
  brand: { select: { name: true, parentBrand: { select: { name: true } } } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
  variants: {
    orderBy: { isDefault: "desc" as const },
    select: { id: true, pricePln: true, stock: true, ean: true, isDefault: true },
  },
} as const;

// Long text/JSON columns — fetched for the visible page only, not for every search candidate
const COMPLETENESS_SELECT = {
  id: true,
  descriptionPl: true,
  shortDescPl: true,
  categoryId: true,
  brandId: true,
  ingredients: true,
  usageInstructionsPl: true,
  responsibleEntity: true,
  metaDescPl: true,
} as const;

type SearchParams = {
  szukaj?: string;
  strona?: string;
  status?: string;
  marka?: string;
  kategoria?: string;
  zdjecie?: string;
  brak?: string;
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
    noEan: params.brak === "ean",
    noDescription: params.brak === "opis",
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
  const skip = (page - 1) * PAGE_SIZE;

  let products: Awaited<
    ReturnType<typeof prisma.product.findMany<{ select: typeof ADMIN_PRODUCT_SELECT }>>
  >;
  let total: number;

  if (filters.search) {
    const candidates = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: SEARCH_CANDIDATE_CAP,
      select: ADMIN_PRODUCT_SELECT,
    });
    const ranked = rankBySearchRelevance(candidates, filters.search);
    total = ranked.length;
    products = ranked.slice(skip, skip + PAGE_SIZE);
  } else {
    [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: ADMIN_PRODUCT_SELECT,
      }),
      prisma.product.count({ where }),
    ]);
  }

  const [brandRows, categories, completenessRows] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true, parentBrandId: true } }),
    prisma.category.findMany({ select: { id: true, namePl: true }, orderBy: { namePl: "asc" } }),
    prisma.product.findMany({
      where: { id: { in: products.map((p) => p.id) } },
      select: COMPLETENESS_SELECT,
    }),
  ]);
  const completenessById = new Map(completenessRows.map((r) => [r.id, r]));

  const brands = toBrandOptions(brandRows).map((b) => ({ id: b.id, name: b.label }));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Produkty"
        actions={
          <Link href="/admin/produkty/nowy" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden />
            Dodaj produkt
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Suspense>
          <AdminSearch placeholder="Szukaj produktów…" />
        </Suspense>
        <Suspense>
          <AdminProductFilters brands={brands} categories={categories} />
        </Suspense>
      </div>

      <ProductsTable
        products={products.map((p) => ({
          ...p,
          // Inline editor works on the default variant only
          variants: p.variants.filter((v) => v.isDefault).slice(0, 1),
          _count: { variants: p.variants.length },
          completeness: (() => {
            const fields = completenessById.get(p.id);
            return fields ? productCompleteness({ ...fields, ...p }).score : 0;
          })(),
        }))}
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
