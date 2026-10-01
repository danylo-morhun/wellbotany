import type { OrderStatus, Prisma } from "@prisma/client";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPagination } from "@/app/admin/components/AdminPagination";
import { AdminSearch } from "@/app/admin/components/AdminSearch";
import { AdminSelectFilter } from "@/app/admin/components/AdminSelectFilter";
import { EmptyState, PageHeader, relativeDate, table } from "@/app/admin/components/ui";
import { Badge } from "@/components/ui/badge";
import { formatPrice, pluralPl } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Klienci" };

const PAGE_SIZE = 50;
const NOT_SALES: OrderStatus[] = ["PENDING", "CANCELLED", "REFUNDED"];

const SORTS = {
  ostatnie: { label: "Ostatnie zamówienie", orderBy: { _max: { createdAt: "desc" } } },
  wartosc: { label: "Łączna wartość", orderBy: { _sum: { totalPln: "desc" } } },
  zamowienia: { label: "Liczba zamówień", orderBy: { _count: { customerEmail: "desc" } } },
} as const satisfies Record<
  string,
  { label: string; orderBy: Prisma.OrderOrderByWithAggregationInput }
>;

type SearchParams = { szukaj?: string; sort?: string; strona?: string };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.strona ?? "1", 10) || 1);
  const search = params.szukaj?.trim();
  const sortKey = (
    params.sort && params.sort in SORTS ? params.sort : "ostatnie"
  ) as keyof typeof SORTS;

  // Customers = everyone who ordered (guests included), keyed by e-mail
  const where: Prisma.OrderWhereInput = {
    status: { notIn: NOT_SALES },
    ...(search && {
      OR: [
        { customerEmail: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
      ],
    }),
  };

  const [groups, totalGroups] = await Promise.all([
    prisma.order.groupBy({
      by: ["customerEmail"],
      where,
      _count: { customerEmail: true },
      _sum: { totalPln: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
      orderBy: SORTS[sortKey].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.order.groupBy({ by: ["customerEmail"], where }).then((g) => g.length),
  ]);

  const emails = groups.map((g) => g.customerEmail);
  const [latest, subscribers] = await Promise.all([
    prisma.order.findMany({
      where: { customerEmail: { in: emails } },
      distinct: ["customerEmail"],
      orderBy: { createdAt: "desc" },
      select: { customerEmail: true, customerName: true, customerId: true, shipCity: true },
    }),
    prisma.newsletterSubscriber.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    }),
  ]);
  const latestByEmail = new Map(latest.map((l) => [l.customerEmail, l]));
  const subscribed = new Set(subscribers.map((s) => s.email.toLowerCase()));
  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Klienci"
        description="Wszyscy kupujący — z kontem i bez — zgrupowani po adresie e-mail."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Suspense>
          <AdminSearch placeholder="Imię, e-mail, telefon…" />
        </Suspense>
        <Suspense>
          <AdminSelectFilter
            param="sort"
            label="Sortuj"
            allLabel="Sortuj: ostatnie zamówienie"
            options={[
              { value: "wartosc", label: "Sortuj: łączna wartość" },
              { value: "zamowienia", label: "Sortuj: liczba zamówień" },
            ]}
          />
        </Suspense>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-card">
          <EmptyState icon={Users} title="Brak klientów" />
        </div>
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead className={table.thead}>
              <tr>
                <th className={table.th}>Klient</th>
                <th className={table.th}>Miasto</th>
                <th className={`${table.th} text-right`}>Zamówienia</th>
                <th className={`${table.th} text-right`}>Łącznie</th>
                <th className={`${table.th} text-right`}>Śr. koszyk</th>
                <th className={table.th}>Ostatnie</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const info = latestByEmail.get(g.customerEmail);
                const count = g._count.customerEmail;
                const sum = g._sum.totalPln ?? 0;
                return (
                  <tr key={g.customerEmail} className={table.tr}>
                    <td className={`${table.td} py-2.5`}>
                      <Link
                        href={`/admin/klienci/${encodeURIComponent(g.customerEmail)}`}
                        className="font-medium hover:text-primary"
                      >
                        {info?.customerName ?? g.customerEmail}
                      </Link>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {g.customerEmail}
                        {info?.customerId && <Badge tone="primary">konto</Badge>}
                        {subscribed.has(g.customerEmail.toLowerCase()) && (
                          <Badge tone="info">newsletter</Badge>
                        )}
                      </p>
                    </td>
                    <td className={`${table.td} text-muted-foreground`}>{info?.shipCity ?? "—"}</td>
                    <td className={`${table.td} text-right tabular-nums`}>
                      {count > 1 ? <Badge tone="success">{count}×</Badge> : count}
                    </td>
                    <td className={`${table.td} text-right font-medium tabular-nums`}>
                      {formatPrice(sum)}
                    </td>
                    <td className={`${table.td} text-right tabular-nums text-muted-foreground`}>
                      {formatPrice(Math.round(sum / count))}
                    </td>
                    <td className={`${table.td} text-muted-foreground`}>
                      {g._max.createdAt && relativeDate(g._max.createdAt, now)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <p className="text-xs text-muted-foreground tabular-nums">
          {totalGroups} {pluralPl(totalGroups, "klient", "klientów", "klientów")}
        </p>
        <Suspense>
          <AdminPagination currentPage={page} totalPages={Math.ceil(totalGroups / PAGE_SIZE)} />
        </Suspense>
      </div>
    </div>
  );
}
