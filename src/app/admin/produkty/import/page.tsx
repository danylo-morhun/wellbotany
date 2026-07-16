import Link from "next/link";
import { ImportProductsClient } from "@/features/products/components/ImportProductsClient";
import { getSupplierSourcesForPage } from "@/features/products/import-actions";

export default async function AdminImportProductsPage() {
  const sources = await getSupplierSourcesForPage();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import z cenników</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masowy import produktów z plików dostawców
          </p>
        </div>
        <Link
          href="/admin/produkty"
          className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          ← Produkty
        </Link>
      </div>

      <ImportProductsClient sources={sources} />
    </div>
  );
}
