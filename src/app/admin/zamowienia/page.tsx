import type { OrderStatus } from "@prisma/client";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPagination } from "@/app/admin/components/AdminPagination";
import { AdminSearch } from "@/app/admin/components/AdminSearch";
import { OrderStatusFilter } from "@/app/admin/components/OrderStatusFilter";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Oczekujące",
  PAYMENT_PENDING: "Oczekuje płatności",
  PAID: "Opłacone",
  PROCESSING: "W realizacji",
  SHIPPED: "Wysłane",
  DELIVERED: "Dostarczone",
  CANCELLED: "Anulowane",
  REFUNDED: "Zwrócone",
};

const PAGE_SIZE = 25;

type SearchParams = { szukaj?: string; status?: string; strona?: string };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.strona ?? "1", 10));
  const search = params.szukaj ?? "";
  const statusFilter = params.status as OrderStatus | undefined;

  const where = {
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" as const } },
            { customerEmail: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalPln: true,
        customerEmail: true,
        createdAt: true,
        allegroOrderId: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Zamówienia</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Suspense>
          <AdminSearch placeholder="Szukaj zamówień lub emaila…" />
        </Suspense>
      </div>

      <Suspense>
        <OrderStatusFilter />
      </Suspense>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Numer</th>
              <th className="px-4 py-3 font-medium">Źródło</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Kwota</th>
              <th className="px-4 py-3 font-medium">Klient</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/zamowienia/${order.id}`}
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {order.allegroOrderId ? (
                    <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                      Allegro
                    </span>
                  ) : (
                    <span className="rounded-full bg-info/15 px-2 py-0.5 text-xs font-medium text-info">
                      Sklep
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {(order.totalPln / 100).toLocaleString("pl-PL", {
                    style: "currency",
                    currency: "PLN",
                  })}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{order.customerEmail}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.createdAt.toLocaleDateString("pl-PL")}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Brak zamówień
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-4">
        <p className="text-xs text-muted-foreground">
          {total} {total === 1 ? "zamówienie" : "zamówień"}
        </p>
        <Suspense>
          <AdminPagination currentPage={page} totalPages={totalPages} />
        </Suspense>
      </div>
    </div>
  );
}
