import { CircleCheck, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, Panel, table } from "@/app/admin/components/ui";
import {
  COST_MAX_CHANGE,
  compareCatalog,
  pairVariants,
  percentChange,
} from "@/features/stock-sync/lib/catalog-plan";
import { variantIndex } from "@/features/stock-sync/lib/plan";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Subiekt vs sklep" };

const ROWS = 300;
const pl = (n: number) => n.toLocaleString("pl-PL");
const dateTime = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

type Props = { searchParams: Promise<{ widok?: string; poziom?: string }> };

export default async function AdminSubiektPage({ searchParams }: Props) {
  const { widok, poziom } = await searchParams;
  const location = await prisma.stockLocation.findFirst({
    where: { catalogSyncedAt: { not: null } },
    orderBy: { catalogSyncedAt: "desc" },
    select: { id: true, code: true, catalogSyncedAt: true, priceLevelNames: true },
  });

  if (!location) {
    return (
      <div className="space-y-6">
        <PageHeader title="Subiekt vs sklep" />
        <EmptyState icon={RefreshCw} title="Subiekt nie przysłał jeszcze kartoteki">
          Agent w sklepie wysyła ceny, ceny zakupu, VAT i wagę kilka razy dziennie — dane pojawią
          się po jego pierwszym przebiegu.
        </EmptyState>
      </div>
    );
  }

  const [cards, rawVariants] = await Promise.all([
    prisma.subiektProduct.findMany({
      where: { locationId: location.id },
      select: {
        symbol: true,
        ean: true,
        name: true,
        vatRate: true,
        purchaseNetPln: true,
        pricesGrossPln: true,
        weightGrams: true,
        lastDeliveryAt: true,
        lastDeliveryNetPln: true,
        supplierName: true,
        blocked: true,
      },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { status: "ACTIVE" } },
      select: {
        id: true,
        sku: true,
        ean: true,
        optionValue: true,
        pricePln: true,
        costPricePln: true,
        vatRate: true,
        weightGrams: true,
        product: { select: { id: true, namePl: true } },
      },
    }),
  ]);
  const variants = rawVariants.map((v) => ({
    ...v,
    vatRate: Number(v.vatRate),
    weightGrams: v.weightGrams === null ? null : Math.round(v.weightGrams),
  }));
  const reportCards = cards.map((c) => ({
    ...c,
    vatRate: c.vatRate === null ? null : Number(c.vatRate),
  }));

  const levelNames = location.priceLevelNames;
  const levelCount = Math.max(1, levelNames.length);
  const level = Math.min(levelCount, Math.max(1, Number(poziom) || 1));
  const { pairs, missing } = pairVariants(variants, reportCards, variantIndex(variants));
  const views = compareCatalog(pairs, level);

  const tabs = {
    ceny: `Inna cena (${views.prices.length})`,
    zakup: `Cena zakupu (${views.costs.length})`,
    vat: `Inny VAT (${views.vat.length})`,
    waga: `Brak wagi (${views.weight.length})`,
    zablokowane: `Zablokowane w Subiekcie (${views.blocked.length})`,
    "bez-pary": `Brak w Subiekcie (${missing.length})`,
  } as const;
  const view = widok && widok in tabs ? (widok as keyof typeof tabs) : "ceny";
  const href = (w: string, p = level) => `/admin/subiekt?widok=${w}${p > 1 ? `&poziom=${p}` : ""}`;
  const levelLabel = (n: number) => levelNames[n - 1] || `Poziom ${n}`;

  const name = (v: (typeof variants)[number]) => (
    <>
      <Link href={`/admin/produkty/${v.product.id}`} className="hover:underline">
        {v.product.namePl}
        {v.optionValue ? ` (${v.optionValue})` : ""}
      </Link>
      <span className="block text-xs text-muted-foreground">{v.sku}</span>
    </>
  );
  const numeric = cn(table.td, "text-right tabular-nums");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subiekt vs sklep"
        description={`Kartoteka z Subiekta (${location.code}) porównana z produktami sklepu. Ceny zakupu z Subiekta przechodzą do sklepu same, chyba że zmiana przekracza ${COST_MAX_CHANGE * 100}% — te są tu do sprawdzenia. Ceny sprzedaży zmieniasz ręcznie.`}
        meta={
          location.catalogSyncedAt
            ? `Ostatnia kartoteka: ${dateTime.format(location.catalogSyncedAt)}`
            : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Panel title="Kart w Subiekcie">
          <p className="text-2xl font-semibold">{pl(cards.length)}</p>
        </Panel>
        <Panel title="Wariantów sklepu z parą">
          <p className="text-2xl font-semibold">{pl(pairs.length)}</p>
        </Panel>
        <Panel title="Inna cena">
          <p className="text-2xl font-semibold">{pl(views.prices.length)}</p>
        </Panel>
        <Panel title="Bez pary w Subiekcie">
          <p className="text-2xl font-semibold">{pl(missing.length)}</p>
        </Panel>
      </div>

      <nav aria-label="Widok" className="flex flex-wrap gap-2 text-sm">
        {Object.entries(tabs).map(([key, label]) => (
          <Link
            key={key}
            href={href(key)}
            aria-current={key === view ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 pointer-coarse:py-2.5",
              key === view ? "bg-primary text-primary-foreground" : "bg-card shadow-card",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {view === "ceny" && levelCount > 1 && (
        <nav aria-label="Poziom cen Subiekta" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Porównaj z poziomem:</span>
          {Array.from({ length: levelCount }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href("ceny", n)}
              aria-current={n === level ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 pointer-coarse:py-2",
                n === level
                  ? "bg-secondary font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {levelLabel(n)}
            </Link>
          ))}
        </nav>
      )}

      <div className={table.wrap}>
        <table className={table.table}>
          {view === "ceny" && (
            <>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Produkt</th>
                  <th className={cn(table.th, "text-right")}>Sklep</th>
                  <th className={cn(table.th, "text-right")}>Subiekt — {levelLabel(level)}</th>
                  <th className={cn(table.th, "text-right")}>Różnica</th>
                </tr>
              </thead>
              <tbody>
                {[...views.prices]
                  .sort(
                    (a, b) =>
                      Math.abs(
                        percentChange(b.variant.pricePln, b.card.pricesGrossPln[level - 1] ?? 0),
                      ) -
                      Math.abs(
                        percentChange(a.variant.pricePln, a.card.pricesGrossPln[level - 1] ?? 0),
                      ),
                  )
                  .slice(0, ROWS)
                  .map(({ variant: v, card: c }) => (
                    <tr key={v.id} className={table.tr}>
                      <td className={table.td}>{name(v)}</td>
                      <td className={numeric}>{formatPrice(v.pricePln)}</td>
                      <td className={numeric}>{formatPrice(c.pricesGrossPln[level - 1] ?? 0)}</td>
                      <td className={numeric}>
                        {pl(percentChange(v.pricePln, c.pricesGrossPln[level - 1] ?? 0))}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </>
          )}
          {view === "zakup" && (
            <>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Produkt</th>
                  <th className={cn(table.th, "text-right")}>Sklep (netto)</th>
                  <th className={cn(table.th, "text-right")}>Subiekt (netto)</th>
                  <th className={cn(table.th, "text-right")}>Ostatnia dostawa</th>
                  <th className={table.th}>Dostawca</th>
                </tr>
              </thead>
              <tbody>
                {views.costs.slice(0, ROWS).map(({ variant: v, card: c }) => (
                  <tr key={v.id} className={table.tr}>
                    <td className={table.td}>{name(v)}</td>
                    <td className={numeric}>
                      {v.costPricePln ? formatPrice(v.costPricePln) : "—"}
                    </td>
                    <td className={numeric}>
                      {c.purchaseNetPln ? formatPrice(c.purchaseNetPln) : "0 w kartotece"}
                      {c.purchaseNetPln && v.costPricePln ? (
                        <span className="block text-xs text-muted-foreground">
                          {pl(percentChange(v.costPricePln, c.purchaseNetPln))}%
                        </span>
                      ) : null}
                    </td>
                    <td className={numeric}>
                      {c.lastDeliveryNetPln ? formatPrice(c.lastDeliveryNetPln) : "—"}
                      {c.lastDeliveryAt && (
                        <span className="block text-xs text-muted-foreground">
                          {c.lastDeliveryAt.toISOString().slice(0, 10)}
                        </span>
                      )}
                    </td>
                    <td className={table.td}>{c.supplierName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {view === "vat" && (
            <>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Produkt</th>
                  <th className={cn(table.th, "text-right")}>VAT sklep</th>
                  <th className={cn(table.th, "text-right")}>VAT Subiekt</th>
                </tr>
              </thead>
              <tbody>
                {views.vat.slice(0, ROWS).map(({ variant: v, card: c }) => (
                  <tr key={v.id} className={table.tr}>
                    <td className={table.td}>{name(v)}</td>
                    <td className={numeric}>{pl(v.vatRate)}%</td>
                    <td className={numeric}>{pl(c.vatRate ?? 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {view === "waga" && (
            <>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Produkt</th>
                  <th className={cn(table.th, "text-right")}>Waga w Subiekcie</th>
                </tr>
              </thead>
              <tbody>
                {views.weight.slice(0, ROWS).map(({ variant: v, card: c }) => (
                  <tr key={v.id} className={table.tr}>
                    <td className={table.td}>{name(v)}</td>
                    <td className={numeric}>{pl(c.weightGrams ?? 0)} g</td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {(view === "zablokowane" || view === "bez-pary") && (
            <>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Produkt</th>
                  <th className={cn(table.th, "text-right")}>Cena</th>
                  <th className={table.th}>EAN</th>
                </tr>
              </thead>
              <tbody>
                {(view === "zablokowane" ? views.blocked.map((p) => p.variant) : missing)
                  .slice(0, ROWS)
                  .map((v) => (
                    <tr key={v.id} className={table.tr}>
                      <td className={table.td}>{name(v)}</td>
                      <td className={numeric}>{formatPrice(v.pricePln)}</td>
                      <td className={table.td}>{v.ean ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </>
          )}
        </table>
        {(
          {
            ceny: views.prices,
            zakup: views.costs,
            vat: views.vat,
            waga: views.weight,
            zablokowane: views.blocked,
            "bez-pary": missing,
          } as const
        )[view].length === 0 && <EmptyState icon={CircleCheck} title="Wszystko się zgadza" />}
      </div>
    </div>
  );
}
