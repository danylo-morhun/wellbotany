import type { ProductStatus } from "@prisma/client";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPagination } from "@/app/admin/components/AdminPagination";
import { AdminSearch } from "@/app/admin/components/AdminSearch";
import { DeleteProductButton } from "@/features/products/components/DeleteProductButton";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywny",
  ARCHIVED: "Zarchiwizowany",
};

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

  const where = search
    ? {
        OR: [
          { namePl: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [products, total] = await Promise.all([
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

      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Nazwa</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Kategoria</th>
              <th className="px-4 py-3 font-medium">Marka</th>
              <th className="px-4 py-3 font-medium">Warianty</th>
              <th className="px-4 py-3 font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/produkty/${product.id}`}
                    className="font-medium hover:underline"
                  >
                    {product.namePl}
                  </Link>
                  <p className="text-xs text-muted-foreground">{product.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {STATUS_LABELS[product.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {product.category?.namePl ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{product.brand?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{product._count.variants}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/produkty/${product.id}`}
                      className="rounded-lg border border-border px-2 py-1 text-xs"
                    >
                      Edytuj
                    </Link>
                    <DeleteProductButton productId={product.id} productName={product.namePl} />
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Brak produktów
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
