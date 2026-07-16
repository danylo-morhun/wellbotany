"use client";

import type { ProductStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProductSelection } from "../lib/useProductSelection";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { DeleteProductButton } from "./DeleteProductButton";

const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Szkic",
  ACTIVE: "Aktywny",
  ARCHIVED: "Zarchiwizowany",
};

type ProductRow = {
  id: string;
  namePl: string;
  slug: string;
  status: ProductStatus;
  category: { namePl: string } | null;
  brand: { name: string } | null;
  _count: { variants: number };
};

type Props = {
  products: ProductRow[];
  total: number;
  search: string;
  brands: { id: string; name: string }[];
  categories: { id: string; namePl: string }[];
};

export function ProductsTable({ products, total, search, brands, categories }: Props) {
  const router = useRouter();
  const pageIds = products.map((p) => p.id);
  const selection = useProductSelection(search, pageIds, total);

  const showSelectAllBanner =
    selection.mode === "ids" && selection.isPageFullySelected && total > pageIds.length;

  return (
    <div>
      <BulkActionsToolbar
        count={selection.count}
        selection={{ mode: selection.mode, ids: selection.ids, excludedIds: selection.excludedIds }}
        search={search}
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

      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
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
              <tr
                key={product.id}
                className="border-b last:border-0 hover:bg-muted/30 data-[selected=true]:bg-primary/5"
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
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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
