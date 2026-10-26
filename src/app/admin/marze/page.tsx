import { CircleCheck, TrendingDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, Panel, table } from "@/app/admin/components/ui";
import { variantMargin } from "@/features/products/lib/margin";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Marże" };

// Below this the variant can hardly carry ads, free delivery or a coupon
const LOW_MARGIN_PERCENT = 15;
const ROWS = 200;

const pl = (n: number) => n.toLocaleString("pl-PL");

type Props = { searchParams: Promise<{ widok?: string }> };

export default async function AdminMarginsPage({ searchParams }: Props) {
  const { widok } = await searchParams;
  const variants = await prisma.productVariant.findMany({
    where: { isActive: true, product: { status: "ACTIVE" } },
    select: {
      id: true,
      sku: true,
      optionValue: true,
      pricePln: true,
      costPricePln: true,
      vatRate: true,
      product: { select: { id: true, namePl: true, brand: { select: { name: true } } } },
    },
  });

  const rows = variants.map((v) => ({
    ...v,
    margin: v.costPricePln ? variantMargin(v.pricePln, v.costPricePln, Number(v.vatRate)) : null,
  }));
  const withCost = rows.filter((r) => r.margin);
  const losing = withCost.filter((r) => (r.margin?.marginPln ?? 0) <= 0);
  const low = withCost.filter(
    (r) => (r.margin?.marginPln ?? 0) > 0 && (r.margin?.percent ?? 0) < LOW_MARGIN_PERCENT,
  );
  const missing = rows.filter((r) => !r.margin);
  const sortedPercents = withCost.map((r) => r.margin?.percent ?? 0).sort((a, b) => a - b);
  const median = sortedPercents[Math.floor(sortedPercents.length / 2)] ?? null;

  const views = {
    strata: { label: `Strata (${losing.length})`, rows: losing },
    niska: { label: `Marża < ${LOW_MARGIN_PERCENT}% (${low.length})`, rows: low },
    wszystkie: { label: `Wszystkie z ceną zakupu (${withCost.length})`, rows: withCost },
    brak: { label: `Bez ceny zakupu (${missing.length})`, rows: missing },
  } as const;
  const view = widok && widok in views ? (widok as keyof typeof views) : "strata";
  const shown = [...views[view].rows]
    .sort((a, b) => (a.margin?.percent ?? 0) - (b.margin?.percent ?? 0))
    .slice(0, ROWS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marże"
        description="Marża netto = cena bez VAT minus cena zakupu. Próg ROAS to minimalny zwrot z reklamy (wartość konwersji ÷ koszt), przy którym sprzedaż z reklamy nie przynosi straty — bez kosztu dostawy, rabatów i zwrotów."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Panel title="Mediana marży">
          <p className="text-2xl font-semibold">{median === null ? "—" : `${pl(median)}%`}</p>
        </Panel>
        <Panel title="Ze stratą">
          <p className="text-2xl font-semibold text-destructive">{losing.length}</p>
        </Panel>
        <Panel title={`Marża < ${LOW_MARGIN_PERCENT}%`}>
          <p className="text-2xl font-semibold">{low.length}</p>
        </Panel>
        <Panel title="Bez ceny zakupu">
          <p className="text-2xl font-semibold">{missing.length}</p>
        </Panel>
      </div>

      <nav aria-label="Widok marż" className="flex flex-wrap gap-2 text-sm">
        {Object.entries(views).map(([key, v]) => (
          <Link
            key={key}
            href={`/admin/marze?widok=${key}`}
            aria-current={key === view ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 pointer-coarse:py-2.5",
              key === view ? "bg-primary text-primary-foreground" : "bg-card shadow-card",
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <div className={table.wrap}>
        <table className={table.table}>
          <thead className={table.thead}>
            <tr>
              <th className={table.th}>Produkt</th>
              <th className={table.th}>Marka</th>
              <th className={cn(table.th, "text-right")}>Cena</th>
              <th className={cn(table.th, "text-right")}>Zakup netto</th>
              <th className={cn(table.th, "text-right")}>Marża</th>
              <th className={cn(table.th, "text-right")}>Próg ROAS</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={table.tr}>
                <td className={table.td}>
                  <Link href={`/admin/produkty/${r.product.id}`} className="hover:underline">
                    {r.product.namePl}
                    {r.optionValue ? ` (${r.optionValue})` : ""}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{r.sku}</span>
                </td>
                <td className={table.td}>{r.product.brand?.name ?? "—"}</td>
                <td className={cn(table.td, "text-right")}>{formatPrice(r.pricePln)}</td>
                <td className={cn(table.td, "text-right")}>
                  {r.costPricePln ? formatPrice(r.costPricePln) : "—"}
                </td>
                <td
                  className={cn(
                    table.td,
                    "text-right",
                    r.margin && r.margin.marginPln <= 0 && "font-semibold text-destructive",
                  )}
                >
                  {r.margin && r.margin.marginPln <= 0 && (
                    <TrendingDown className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
                  )}
                  {r.margin ? `${pl(r.margin.percent)}%` : "—"}
                  {r.margin && r.margin.marginPln <= 0 && (
                    <span className="sr-only"> — strata</span>
                  )}
                </td>
                <td className={cn(table.td, "text-right")}>
                  {r.margin
                    ? r.margin.breakEvenRoas === null
                      ? "strata"
                      : pl(r.margin.breakEvenRoas)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <EmptyState icon={CircleCheck} title="Brak wariantów w tym widoku" />
        )}
      </div>
      {views[view].rows.length > ROWS && (
        <p className="text-xs text-muted-foreground">
          Pokazano {ROWS} z {views[view].rows.length} — od najniższej marży.
        </p>
      )}
    </div>
  );
}
