import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Panel, Stat, table } from "@/app/admin/components/ui";
import { DeleteExpenseButton, ExpenseForm } from "@/features/analytics/components/ExpenseForm";
import { returningShare, splitBuyers } from "@/features/analytics/lib/customers";
import { EXPENSE_LABELS, expenseTotals } from "@/features/analytics/lib/expenses";
import { dayKey, PERIODS, resolvePeriod } from "@/features/analytics/lib/period";
import {
  coveragePercent,
  marginPercent,
  mer,
  NOT_SALES,
  profitByProduct,
  profitOrderSelect,
  resultPln,
  summarizeProfit,
  toProfitOrder,
} from "@/features/analytics/lib/profit";
import { REORDER_DAYS, runningOut } from "@/features/analytics/lib/stock";
import { formatPrice, pluralPl } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wyniki" };

const DAY = 86400000;
/** Sales pace for "Kończy się" */
const PACE_DAYS = 30;
/** No web sale for this long → listed as frozen stock */
const FROZEN_DAYS = 90;
const LIST = 10;
/** Below this share of sales with a known cost the margin is flagged as partial */
const FULL_COVERAGE = 95;

type Props = { searchParams: Promise<{ okres?: string }> };

export default async function AdminResultsPage({ searchParams }: Props) {
  const { okres } = await searchParams;
  const now = new Date();
  const period = resolvePeriod(okres, now);
  const sold = { status: { notIn: NOT_SALES } };
  const variantWhere = { isActive: true, trackStock: true, product: { status: "ACTIVE" as const } };

  const [orders, prevOrders, expenses, refunds, withdrawals, pace, recentlySold, stocked] =
    await Promise.all([
      prisma.order.findMany({
        where: { ...sold, createdAt: { gte: period.start, lt: period.end } },
        select: { customerEmail: true, ...profitOrderSelect },
      }),
      prisma.order.findMany({
        where: { ...sold, createdAt: { gte: period.prevStart, lt: period.start } },
        select: profitOrderSelect,
      }),
      prisma.expense.findMany({
        where: {
          date: {
            gte: new Date(`${period.from}T00:00:00Z`),
            lte: new Date(`${period.to}T00:00:00Z`),
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      prisma.order.aggregate({
        where: { status: "REFUNDED", createdAt: { gte: period.start, lt: period.end } },
        _count: { _all: true },
        _sum: { totalPln: true },
      }),
      prisma.withdrawal.count({ where: { createdAt: { gte: period.start, lt: period.end } } }),
      prisma.orderItem.groupBy({
        by: ["variantId"],
        where: {
          variantId: { not: null },
          order: { ...sold, createdAt: { gte: new Date(now.getTime() - PACE_DAYS * DAY) } },
        },
        _sum: { quantity: true },
      }),
      prisma.orderItem.findMany({
        where: {
          variantId: { not: null },
          order: { ...sold, createdAt: { gte: new Date(now.getTime() - FROZEN_DAYS * DAY) } },
        },
        distinct: ["variantId"],
        select: { variantId: true },
      }),
      prisma.productVariant.findMany({
        // Only Subiekt-synced stock is real — hand-kept counts are placeholders
        where: { ...variantWhere, stock: { gt: 0 }, stockLevels: { some: {} } },
        select: { id: true, stock: true, costPricePln: true },
      }),
    ]);

  const profit = summarizeProfit(orders.map(toProfitOrder));
  const prev = summarizeProfit(prevOrders.map(toProfitOrder));
  const costs = expenseTotals(expenses);
  const result = resultPln(profit, costs.total);
  const coverage = coveragePercent(profit);
  const pct = marginPercent(profit);
  const merValue = mer(profit.revenuePln, costs.ads);

  const firstOrders = await prisma.order.groupBy({
    by: ["customerEmail"],
    where: { ...sold, customerEmail: { in: [...new Set(orders.map((o) => o.customerEmail))] } },
    _min: { createdAt: true },
  });
  const buyers = splitBuyers(
    orders.map((o) => o.customerEmail),
    new Map(firstOrders.map((f) => [f.customerEmail, f._min.createdAt ?? period.start])),
    period.start,
  );

  const soldByVariant = new Map(pace.map((p) => [p.variantId, p._sum.quantity ?? 0]));
  const paceVariants = await prisma.productVariant.findMany({
    where: { ...variantWhere, id: { in: [...soldByVariant.keys()].filter((id) => id !== null) } },
    select: { id: true, stock: true },
  });
  const short = runningOut(
    paceVariants.map((v) => ({
      variantId: v.id,
      stock: v.stock,
      sold: soldByVariant.get(v.id) ?? 0,
    })),
    PACE_DAYS,
  ).slice(0, LIST);

  const recentIds = new Set(recentlySold.map((r) => r.variantId));
  const frozen = stocked
    .filter((v) => !recentIds.has(v.id))
    .map((v) => ({ ...v, valuePln: v.costPricePln ? v.costPricePln * v.stock : 0 }));
  const frozenValue = frozen.reduce((s, v) => s + v.valuePln, 0);
  const frozenTop = [...frozen].sort((a, b) => b.valuePln - a.valuePln).slice(0, LIST);

  const names = await prisma.productVariant.findMany({
    where: { id: { in: [...short.map((s) => s.variantId), ...frozenTop.map((f) => f.id)] } },
    select: { id: true, optionValue: true, product: { select: { id: true, namePl: true } } },
  });
  const nameOf = new Map(names.map((n) => [n.id, n]));
  const products = profitByProduct(orders.map(toProfitOrder));
  const earners = products.filter((p) => (p.marginPln ?? 0) > 0).slice(0, LIST);
  const losers = products.filter((p) => p.marginPln !== null && p.marginPln <= 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wyniki"
        description={`${period.from} – ${period.to}. Kwoty zamówień brutto, marża i koszty netto. Liczą się zamówienia złożone, bez anulowanych i zwróconych.`}
      />

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Okres">
        {Object.entries(PERIODS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/wyniki?okres=${key}`}
            aria-current={key === period.key ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5",
              key === period.key ? "bg-primary text-primary-foreground" : "bg-card shadow-card",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5 [&>*]:min-w-0">
        <Stat
          label="Sprzedaż"
          value={formatPrice(profit.revenuePln)}
          current={profit.revenuePln}
          previous={prev.revenuePln}
        />
        <Stat
          label="Zamówienia"
          value={String(profit.orders)}
          current={profit.orders}
          previous={prev.orders}
        />
        <Stat
          label={pct === null ? "Marża na towarach" : `Marża na towarach (${pct}%)`}
          value={formatPrice(profit.marginPln)}
          current={profit.marginPln}
          previous={prev.marginPln}
        />
        <Stat
          label="Koszty"
          value={formatPrice(costs.total)}
          sub={merValue === null ? "Brak kosztów reklamy" : `MER ${merValue} (sprzedaż ÷ reklama)`}
        />
        <Stat
          label="Wynik"
          value={formatPrice(result)}
          sub={
            coverage < FULL_COVERAGE
              ? `Niepełny — ${100 - coverage}% sprzedaży bez ceny zakupu`
              : "Marża + opłaty za dostawę − koszty"
          }
          tone={result < 0 ? "negative" : undefined}
        />
      </div>

      {coverage < FULL_COVERAGE && (
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm">
          Marża policzona tylko z {coverage}% sprzedaży — reszta produktów nie ma ceny zakupu.{" "}
          <Link href="/admin/marze?widok=brak" className="font-medium text-primary hover:underline">
            Uzupełnij ceny zakupu
          </Link>
        </p>
      )}
      {costs.total === 0 && (
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm">
          Wynik nie uwzględnia kosztów, bo w tym okresie nie wpisano żadnych. Dodaj fakturę za
          reklamę, wysyłki czy abonamenty na dole strony.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title="Na czym zarabiamy">
          {earners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak sprzedaży z ceną zakupu.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {earners.map((p) => (
                <li key={p.key} className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate">{p.productName}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.quantity} szt.
                  </span>
                  <span className="w-24 text-right font-medium tabular-nums">
                    {formatPrice(p.marginPln ?? 0)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {losers.length > 0 && (
            <p className="mt-4 text-sm text-destructive">
              {losers.length}{" "}
              {pluralPl(
                losers.length,
                "produkt sprzedał",
                "produkty sprzedały",
                "produktów sprzedało",
              )}{" "}
              się ze stratą (np. {losers[0].productName}).{" "}
              <Link href="/admin/marze" className="font-medium underline">
                Marże
              </Link>
            </p>
          )}
        </Panel>

        <Panel title={`Kończy się — zapas na mniej niż ${REORDER_DAYS} dni`}>
          {short.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nic się nie kończy przy obecnym tempie.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {short.map((s) => {
                const v = nameOf.get(s.variantId);
                return (
                  <li key={s.variantId} className="flex items-baseline gap-3">
                    <Link
                      href={`/admin/produkty/${v?.product.id ?? ""}`}
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      {v?.product.namePl}
                      {v?.optionValue ? ` (${v.optionValue})` : ""}
                    </Link>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {s.stock} szt. · {s.sold}/{PACE_DAYS} dni
                    </span>
                    <span
                      className={cn(
                        "w-16 text-right font-medium tabular-nums",
                        s.cover < 7 && "text-destructive",
                      )}
                    >
                      {s.cover} dni
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Tempo ze sprzedaży internetowej z {PACE_DAYS} dni. Sklep stacjonarny też sprzedaje, więc
            zapas starczy na krócej.
          </p>
        </Panel>

        <Panel title="Klienci">
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Nowi</dt>
              <dd className="text-xl font-semibold tabular-nums">{buyers.newBuyers}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Powracający</dt>
              <dd className="text-xl font-semibold tabular-nums">{buyers.returningBuyers}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Zamówienia od powracających</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {returningShare(buyers, profit.orders)}%
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Powracający = kupił już przed tym okresem (po adresie e-mail).
          </p>
        </Panel>

        <Panel title="Rabaty i zwroty">
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Rabaty (kody, promocje)</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {formatPrice(profit.discountPln)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Zwrócone zamówienia</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {refunds._count._all}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {formatPrice(refunds._sum.totalPln ?? 0)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Odstąpienia online</dt>
              <dd className="text-xl font-semibold tabular-nums">{withdrawals}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <Panel title={`Zamrożony towar — bez sprzedaży w internecie od ${FROZEN_DAYS} dni`}>
        <p className="mb-3 text-sm">
          {frozen.length} {pluralPl(frozen.length, "wariant", "warianty", "wariantów")} na stanie w
          Subiekcie, wartość w cenach zakupu <strong>{formatPrice(frozenValue)}</strong>. Kandydaci
          do promocji lub do wstrzymania zamówień u dostawcy.
        </p>
        <ul className="space-y-2 text-sm">
          {frozenTop.map((f) => {
            const v = nameOf.get(f.id);
            return (
              <li key={f.id} className="flex items-baseline gap-3">
                <Link
                  href={`/admin/produkty/${v?.product.id ?? ""}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {v?.product.namePl}
                  {v?.optionValue ? ` (${v.optionValue})` : ""}
                </Link>
                <span className="text-xs text-muted-foreground tabular-nums">{f.stock} szt.</span>
                <span className="w-24 text-right font-medium tabular-nums">
                  {f.valuePln ? formatPrice(f.valuePln) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Koszty w tym okresie">
        <ExpenseForm defaultDate={dayKey(now)} />
        {expenses.length > 0 && (
          <div className={cn(table.wrap, "mt-5 shadow-none")}>
            <table className={table.table}>
              <thead className={table.thead}>
                <tr>
                  <th className={table.th}>Dzień</th>
                  <th className={table.th}>Rodzaj</th>
                  <th className={table.th}>Opis</th>
                  <th className={cn(table.th, "text-right")}>Netto</th>
                  <th className={table.th}>
                    <span className="sr-only">Usuń</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className={table.tr}>
                    <td className={cn(table.td, "tabular-nums")}>
                      {e.date.toISOString().slice(0, 10)}
                    </td>
                    <td className={table.td}>{EXPENSE_LABELS[e.category]}</td>
                    <td className={cn(table.td, "text-muted-foreground")}>{e.note ?? ""}</td>
                    <td className={cn(table.td, "text-right tabular-nums")}>
                      {formatPrice(e.amountPln)}
                    </td>
                    <td className={cn(table.td, "w-12")}>
                      <DeleteExpenseButton id={e.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {costs.byCategory.size > 1 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {[...costs.byCategory]
              .map(([c, sum]) => `${EXPENSE_LABELS[c]}: ${formatPrice(sum)}`)
              .join(" · ")}
          </p>
        )}
      </Panel>
    </div>
  );
}
