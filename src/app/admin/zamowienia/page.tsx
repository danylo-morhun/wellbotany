import type { PaymentMethod, Prisma, ShippingMethod } from "@prisma/client";
import { Inbox, Landmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminPagination } from "@/app/admin/components/AdminPagination";
import { AdminSearch } from "@/app/admin/components/AdminSearch";
import { AdminSelectFilter } from "@/app/admin/components/AdminSelectFilter";
import { EmptyState, PageHeader, relativeDate } from "@/app/admin/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { PAYMENT_LABELS } from "@/features/checkout/lib/payment";
import { shippingLabel } from "@/features/checkout/lib/shipping";
import { type OrderRow, OrdersTable } from "@/features/orders/components/OrdersTable";
import { ORDER_VIEWS, resolveOrderView } from "@/features/orders/lib/views";
import { pluralPl } from "@/lib/format";
import { pickupLocation } from "@/lib/pickup-locations";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Zamówienia" };

const PAGE_SIZE = 50;

const SHIPPING_OPTIONS: ShippingMethod[] = [
  "INPOST_PACZKOMAT",
  "ORLEN_PACZKA",
  "COURIER",
  "INPOST_KURIER",
  "PICKUP",
];
const PAYMENT_OPTIONS: PaymentMethod[] = [
  "BANK_TRANSFER",
  "CASH_ON_DELIVERY",
  "PRZELEWY24",
  "BLIK",
];

type SearchParams = {
  szukaj?: string;
  widok?: string;
  dostawa?: string;
  platnosc?: string;
  strona?: string;
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.strona ?? "1", 10) || 1);
  const search = params.szukaj?.trim() ?? "";
  const view = resolveOrderView(params.widok);
  const shipping = SHIPPING_OPTIONS.find((s) => s === params.dostawa);
  const payment = PAYMENT_OPTIONS.find((p) => p === params.platnosc);

  // Filters shared by the list and the per-view tab counts
  const baseWhere: Prisma.OrderWhereInput = {
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
      ],
    }),
    ...(shipping && { shippingMethod: shipping }),
    ...(payment && { paymentMethod: payment }),
  };
  const where: Prisma.OrderWhereInput = {
    ...baseWhere,
    ...(view.statuses && { status: { in: view.statuses } }),
  };

  const [orders, total, statusCounts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: view.oldestFirst ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        shippingMethod: true,
        paymentMethod: true,
        paymentStatus: true,
        totalPln: true,
        customerName: true,
        customerEmail: true,
        createdAt: true,
        inpostMachineId: true,
        pickupLocation: true,
        shipCity: true,
        wantsFaktura: true,
        noteCustomer: true,
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
  ]);

  const countFor = (statuses: string[] | null) =>
    statusCounts
      .filter((c) => !statuses || statuses.includes(c.status))
      .reduce((sum, c) => sum + c._count._all, 0);

  const now = new Date();
  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    shippingMethod: o.shippingMethod,
    shippingLabel: shippingLabel(o.shippingMethod),
    shippingDetail:
      o.shippingMethod === "PICKUP"
        ? (pickupLocation(o.pickupLocation)?.address ?? o.pickupLocation)
        : (o.inpostMachineId ?? o.shipCity),
    paymentLabel: PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod,
    isPaid: o.paymentStatus === "CAPTURED",
    totalPln: o.totalPln,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    dateLabel: relativeDate(o.createdAt, now),
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    wantsFaktura: o.wantsFaktura,
    hasCustomerNote: !!o.noteCustomer?.trim(),
  }));

  const tabHref = (key: string) => {
    const qs = new URLSearchParams();
    if (key !== "wszystkie") qs.set("widok", key);
    if (search) qs.set("szukaj", search);
    if (shipping) qs.set("dostawa", shipping);
    if (payment) qs.set("platnosc", payment);
    return qs.size ? `/admin/zamowienia?${qs}` : "/admin/zamowienia";
  };

  return (
    <div>
      <PageHeader
        title="Zamówienia"
        actions={
          <Link
            href="/admin/zamowienia/przelewy"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            <Landmark aria-hidden />
            Rozlicz przelewy
          </Link>
        }
      />

      <nav
        aria-label="Widoki zamówień"
        className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-border px-1"
      >
        {ORDER_VIEWS.map((v) => {
          const active = v.key === view.key;
          const count = countFor(v.statuses);
          return (
            <Link
              key={v.key}
              href={tabHref(v.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors motion-reduce:transition-none",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums leading-5",
                  active ? "bg-secondary text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Suspense>
          <AdminSearch placeholder="Numer, klient, e-mail, telefon…" />
        </Suspense>
        <Suspense>
          <AdminSelectFilter
            param="dostawa"
            label="Filtruj po dostawie"
            allLabel="Każda dostawa"
            options={SHIPPING_OPTIONS.map((s) => ({ value: s, label: shippingLabel(s) }))}
          />
        </Suspense>
        <Suspense>
          <AdminSelectFilter
            param="platnosc"
            label="Filtruj po płatności"
            allLabel="Każda płatność"
            options={PAYMENT_OPTIONS.map((p) => ({ value: p, label: PAYMENT_LABELS[p] ?? p }))}
          />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-card shadow-card">
          <EmptyState icon={Inbox} title="Brak zamówień w tym widoku">
            {view.key === "do-spakowania" && "Wszystko spakowane."}
          </EmptyState>
        </div>
      ) : (
        <OrdersTable orders={rows} />
      )}

      <div className="flex items-center justify-between pt-4">
        <p className="text-xs text-muted-foreground tabular-nums">
          {total} {pluralPl(total, "zamówienie", "zamówienia", "zamówień")}
        </p>
        <Suspense>
          <AdminPagination currentPage={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
        </Suspense>
      </div>
    </div>
  );
}
