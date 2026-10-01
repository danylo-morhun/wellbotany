"use client";

import type { ProductStatus } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProductSelection } from "../lib/useProductSelection";
import type { ProductFilters } from "../lib/where";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { InlineVariantEditor } from "./InlineVariantEditor";
import { ProductRowActions } from "./ProductRowActions";

const STATUS_BADGE: Record<
  ProductStatus,
  { tone: "success" | "warning" | "neutral"; label: string }
> = {
  DRAFT: { tone: "warning", label: "Szkic" },
  ACTIVE: { tone: "success", label: "Aktywny" },
  ARCHIVED: { tone: "neutral", label: "Zarchiwizowany" },
};

type ProductRow = {
  id: string;
  namePl: string;
  slug: string;
  status: ProductStatus;
  category: { namePl: string } | null;
  brand: { name: string } | null;
  _count: { variants: number };
  images: { url: string }[];
  variants: { id: string; pricePln: number; stock: number }[];
  completeness: number;
};

type Props = {
  products: ProductRow[];
  total: number;
  filters: ProductFilters;
  brands: { id: string; name: string }[];
  categories: { id: string; namePl: string }[];
};

export function ProductsTable({ products, total, filters, brands, categories }: Props) {
  const router = useRouter();
  const pageIds = products.map((p) => p.id);
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const selection = useProductSelection(filterKey, pageIds, total);

  const showSelectAllBanner =
    selection.mode === "ids" && selection.isPageFullySelected && total > pageIds.length;

  return (
    <div>
      <BulkActionsToolbar
        count={selection.count}
        selection={{ mode: selection.mode, ids: selection.ids, excludedIds: selection.excludedIds }}
        filters={filters}
        brands={brands}
        categories={categories}
        onClear={selection.clear}
        onDone={() => {
          selection.clear();
          router.refresh();
        }}
      />

      {showSelectAllBanner && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm">
          <span>Zaznaczono {pageIds.length} produktów na tej stronie.</span>
          <button
            type="button"
            onClick={selection.selectAllMatching}
            className="font-medium text-primary underline underline-offset-2"
          >
            Zaznacz wszystkie {total} pasujące
          </button>
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
            <tr className="border-b border-border text-left">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selection.isPageFullySelected}
                  ref={(el) => {
                    if (el) el.indeterminate = selection.isPagePartiallySelected;
                  }}
                  onChange={selection.togglePageAll}
                  aria-label="Zaznacz wszystkie na stronie"
                />
              </th>
              <th className="w-14 px-4 py-3" />
              <th className="px-4 py-3 font-medium">Nazwa</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Kategoria</th>
              <th className="px-4 py-3 font-medium">Marka</th>
              <th className="px-4 py-3 font-medium">Cena / Stan</th>
              <th className="px-4 py-3 font-medium">Warianty</th>
              <th className="px-4 py-3 font-medium">Karta</th>
              <th className="w-12 px-4 py-3">
                <span className="sr-only">Akcje</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-border/70 last:border-0 hover:bg-muted/40 data-[selected=true]:bg-secondary/50"
                data-selected={selection.isSelected(product.id)}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(product.id)}
                    onChange={() => selection.toggleRow(product.id)}
                    aria-label={`Zaznacz ${product.namePl}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                    {product.images[0] && (
                      <Image
                        src={product.images[0].url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    )}
                  </div>
                </td>
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
                  <Badge tone={STATUS_BADGE[product.status].tone} dot>
                    {STATUS_BADGE[product.status].label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {product.category?.namePl ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{product.brand?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {product.variants[0] ? (
                    <InlineVariantEditor
                      variantId={product.variants[0].id}
                      pricePln={product.variants[0].pricePln}
                      stock={product.variants[0].stock}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{product._count.variants}</td>
                <td className="px-4 py-3">
                  <div
                    className="flex items-center gap-2"
                    title={`Kompletność karty: ${product.completeness}%`}
                  >
                    <div className="h-1.5 w-12 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          product.completeness === 100
                            ? "bg-success"
                            : product.completeness >= 70
                              ? "bg-primary"
                              : "bg-warning",
                        )}
                        style={{ width: `${product.completeness}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {product.completeness}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ProductRowActions
                    productId={product.id}
                    productName={product.namePl}
                    slug={product.slug}
                    isActive={product.status === "ACTIVE"}
                  />
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  Brak produktów
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
