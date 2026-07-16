"use client";

import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { previewSupplierImport, runSupplierImport } from "../import-actions";

type SourceInfo = {
  id: string;
  label: string;
  brandName: string;
  filePath: string;
  fileExists: boolean;
};

type PreviewProduct = {
  externalKey: string;
  name: string;
  categoryName: string | null;
  sku: string | null;
  ean: string | null;
  priceGrosz: number;
  stock: number;
  hasImage: boolean;
  existsInDb: boolean;
};

function formatPln(grosz: number): string {
  return `${(grosz / 100).toFixed(2)} zł`;
}

export function ImportProductsClient({ sources }: { sources: SourceInfo[] }) {
  const [selectedSourceId, setSelectedSourceId] = useState(
    sources.find((s) => s.fileExists)?.id ?? "",
  );
  const [products, setProducts] = useState<PreviewProduct[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [updateExisting, setUpdateExisting] = useState(true);

  const { execute: preview, isPending: previewing } = useAction(previewSupplierImport, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setProducts(data.products);
      const newKeys = new Set(data.products.filter((p) => !p.existsInDb).map((p) => p.externalKey));
      setSelectedKeys(newKeys);
      toast.success(`Wczytano ${data.total} produktów`);
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Błąd podczas wczytywania pliku");
    },
  });

  const { execute: runImport, isPending: importing } = useAction(runSupplierImport, {
    onSuccess: ({ data }) => {
      if (!data) return;
      toast.success(
        `Import zakończony: ${data.created} nowych, ${data.updated} zaktualizowanych, ${data.skipped} pominiętych, ${data.errors} błędów`,
      );
      if (selectedSourceId) preview({ sourceId: selectedSourceId });
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Błąd podczas importu");
    },
  });

  const allSelected = products.length > 0 && selectedKeys.size === products.length;
  const selectedSource = sources.find((s) => s.id === selectedSourceId);

  const stats = useMemo(() => {
    const newCount = products.filter((p) => !p.existsInDb).length;
    const existingCount = products.filter((p) => p.existsInDb).length;
    return { newCount, existingCount };
  }, [products]);

  function toggleAll() {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(products.map((p) => p.externalKey)));
    }
  }

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-4 font-semibold">Źródło danych</h2>
        <div className="space-y-3">
          {sources.map((source) => (
            <label
              key={source.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                selectedSourceId === source.id ? "border-primary bg-primary/5" : "border-border"
              } ${!source.fileExists ? "opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="source"
                value={source.id}
                checked={selectedSourceId === source.id}
                disabled={!source.fileExists}
                onChange={() => setSelectedSourceId(source.id)}
                className="mt-1"
              />
              <div>
                <p className="font-medium">{source.label}</p>
                <p className="text-xs text-muted-foreground">
                  Marka: {source.brandName} · {source.filePath}
                </p>
                {!source.fileExists && (
                  <p className="mt-1 text-xs text-destructive">Plik nie znaleziony w projekcie</p>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!selectedSourceId || previewing}
            onClick={() => preview({ sourceId: selectedSourceId })}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            {previewing ? "Wczytywanie…" : "Wczytaj podgląd"}
          </button>
          {products.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {stats.newCount} nowych · {stats.existingCount} już w bazie
            </p>
          )}
        </div>
      </section>

      {products.length > 0 && (
        <section className="rounded-2xl bg-card p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">
              Podgląd ({selectedKeys.size}/{products.length} zaznaczonych)
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                />
                Aktualizuj istniejące (cena, stan)
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="rounded-lg border border-border px-3 py-1.5 text-xs"
              >
                {allSelected ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
              </button>
              <button
                type="button"
                disabled={selectedKeys.size === 0 || importing}
                onClick={() =>
                  runImport({
                    sourceId: selectedSourceId,
                    externalKeys: [...selectedKeys],
                    updateExisting,
                  })
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
              >
                {importing ? "Importowanie…" : `Importuj (${selectedKeys.size})`}
              </button>
            </div>
          </div>

          <p className="mb-4 text-xs text-muted-foreground">
            Produkty importowane są jako <strong>szkice</strong>. Po imporcie uzupełnij opisy i
            opublikuj ręcznie. Zdjęcia z URL dostawcy lub z{" "}
            <code className="rounded bg-muted px-1">data/suppliers/images/</code>.
          </p>

          <div className="max-h-[32rem] overflow-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr className="border-b text-left">
                  <th className="px-3 py-2 w-8" />
                  <th className="px-3 py-2 font-medium">Nazwa</th>
                  <th className="px-3 py-2 font-medium">Kategoria</th>
                  <th className="px-3 py-2 font-medium">SKU/EAN</th>
                  <th className="px-3 py-2 font-medium">Cena</th>
                  <th className="px-3 py-2 font-medium">Stan</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.externalKey}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(product.externalKey)}
                        onChange={() => toggleKey(product.externalKey)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{product.name}</p>
                      {!product.hasImage && (
                        <p className="text-xs text-muted-foreground">Brak zdjęcia</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {product.categoryName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {product.sku ?? product.ean ?? "—"}
                    </td>
                    <td className="px-3 py-2">{formatPln(product.priceGrosz)}</td>
                    <td className="px-3 py-2">{product.stock}</td>
                    <td className="px-3 py-2">
                      {product.existsInDb ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">W bazie</span>
                      ) : (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Nowy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedSource && (
        <section className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Jak to działa</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Umieść pliki cenników w katalogu projektu (ścieżki w konfiguracji).</li>
            <li>
              Rozpakuj archiwa ze zdjęciami do{" "}
              <code className="rounded bg-muted px-1">data/suppliers/images/</code> — system
              dopasuje je po nazwie produktu.
            </li>
            <li>Wczytaj podgląd, zaznacz produkty i kliknij Importuj.</li>
            <li>Produkty trafiają jako szkice — uzupełnij opisy i ustaw status „Aktywny”.</li>
          </ol>
        </section>
      )}
    </div>
  );
}
