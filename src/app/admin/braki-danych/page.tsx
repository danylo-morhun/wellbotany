import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Panel, table } from "@/app/admin/components/ui";
import {
  MISSING_FIELDS,
  type MissingField,
  missingData,
} from "@/features/products/lib/missing-data";
import { type ProductKind, productKind } from "@/features/products/lib/product-kind";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Braki danych" };

const ROWS = 200;

const KIND_LABEL: Record<ProductKind, string> = {
  supplement: "Suplement",
  food: "Żywność",
  nonFood: "Inne",
};

// URL value → field (Polish, like /admin/marze?widok=)
const FIELD_VIEWS: Record<string, MissingField> = {
  sklad: "ingredients",
  ostrzezenia: "warnings",
  porcja: "usage",
  zdjecie: "image",
};

type Props = { searchParams: Promise<{ widok?: string }> };

export default async function AdminMissingDataPage({ searchParams }: Props) {
  const { widok } = await searchParams;
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { namePl: "asc" },
    select: {
      id: true,
      namePl: true,
      ingredients: true,
      healthWarnings: true,
      usageInstructionsPl: true,
      servingSize: true,
      brand: { select: { name: true } },
      category: { select: { slug: true, group: true, parent: { select: { slug: true } } } },
      _count: { select: { images: true } },
    },
  });

  const rows = products
    .map((p) => {
      const kind = productKind(p.category);
      const missing = missingData({ ...p, kind, imageCount: p._count.images });
      return { ...p, kind, missing };
    })
    .filter((r) => r.missing.length > 0);

  const count = (field: MissingField) => rows.filter((r) => r.missing.includes(field)).length;
  const tabs = [
    { key: "wszystkie", label: `Wszystkie braki (${rows.length})` },
    ...Object.entries(FIELD_VIEWS).map(([key, field]) => ({
      key,
      label: `${MISSING_FIELDS[field].label} (${count(field)})`,
    })),
  ];
  const field = widok && Object.hasOwn(FIELD_VIEWS, widok) ? FIELD_VIEWS[widok] : null;
  const view = field ? widok : "wszystkie";
  const matching = field ? rows.filter((r) => r.missing.includes(field)) : rows;
  const shown = matching.slice(0, ROWS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Braki danych"
        description="Aktywne produkty bez danych z etykiety, które sklep internetowy musi pokazać przed zakupem (rozp. 1169/2011 art. 14). Skład — żywność i suplementy; ostrzeżenia oraz porcja — tylko suplementy (rozp. MZ z 9.10.2007). Typ produktu wynika z kategorii głównej."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        {(Object.keys(MISSING_FIELDS) as MissingField[]).map((field) => (
          <Panel key={field} title={`Bez: ${MISSING_FIELDS[field].label.toLowerCase()}`}>
            <p className="text-2xl font-semibold">{count(field)}</p>
          </Panel>
        ))}
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/braki-danych?widok=${key}`}
            className={cn(
              "rounded-full px-3 py-1.5",
              key === view ? "bg-primary text-primary-foreground" : "bg-card shadow-card",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">Brak produktów z brakami w tym widoku.</p>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead className={table.thead}>
              <tr>
                <th className={table.th}>Produkt</th>
                <th className={table.th}>Typ</th>
                <th className={table.th}>Marka</th>
                <th className={table.th}>Brakuje</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={table.tr}>
                  <td className={table.td}>
                    <Link href={`/admin/produkty/${r.id}`} className="hover:underline">
                      {r.namePl}
                    </Link>
                  </td>
                  <td className={table.td}>{KIND_LABEL[r.kind]}</td>
                  <td className={table.td}>{r.brand?.name ?? "—"}</td>
                  <td className={table.td}>
                    <span className="flex flex-wrap gap-1.5">
                      {r.missing.map((field) => (
                        <Link
                          key={field}
                          href={`/admin/produkty/${r.id}#${MISSING_FIELDS[field].section}`}
                          className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/15"
                        >
                          {MISSING_FIELDS[field].label}
                        </Link>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {matching.length > ROWS && (
        <p className="text-xs text-muted-foreground">
          Pokazano {ROWS} z {matching.length} — alfabetycznie.
        </p>
      )}
    </div>
  );
}
