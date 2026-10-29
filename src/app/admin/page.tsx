import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ImageOff,
  Landmark,
  type LucideIcon,
  Mail,
  PackageCheck,
  Star,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import {
  OrderStatusBadge,
  PageHeader,
  Panel,
  relativeDate,
  SHOP_TZ,
  Stat,
} from "@/app/admin/components/ui";
import { RevenueChart, type RevenueDay } from "@/features/admin/components/RevenueChart";
import { addDays, dayKey, shopMidnight } from "@/features/analytics/lib/period";
import {
  marginPercent,
  NOT_SALES,
  profitOrderSelect,
  summarizeProfit,
  toProfitOrder,
} from "@/features/analytics/lib/profit";
import { TO_PACK_STATUSES } from "@/features/orders/lib/status-labels";
import { lowStockWhere } from "@/features/products/lib/stock";
import { formatPrice, pluralPl } from "@/lib/format";
import { PICKUP_HOLD_DAYS } from "@/lib/pickup-locations";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const DAY = 86400000;
const RANGE_DAYS = 30;
const STALE_TRANSFER_DAYS = 3;
const STALE_SHIPMENT_DAYS = 10;

export default async function AdminPage() {
  const now = new Date();
  // KPIs and the chart cover the same shop-local calendar days (today included)
  const dayKeys = Array.from({ length: RANGE_DAYS }, (_, i) =>
    addDays(dayKey(now), i - (RANGE_DAYS - 1)),
  );
  const rangeStart = shopMidnight(dayKeys[0]);
  const prevStart = shopMidnight(addDays(dayKeys[0], -RANGE_DAYS));
  const salesWhere = { status: { notIn: NOT_SALES } };

  const [
    sales,
    prevSales,
    toPack,
    staleTransfers,
    pickupOverdue,
    staleShipments,
    pendingReviews,
    unreadMessages,
    lowStock,
    activeNoImage,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { ...salesWhere, createdAt: { gte: rangeStart } },
      select: { createdAt: true, ...profitOrderSelect },
    }),
    prisma.order.findMany({
      where: { ...salesWhere, createdAt: { gte: prevStart, lt: rangeStart } },
      select: profitOrderSelect,
    }),
    prisma.order.count({ where: { status: { in: TO_PACK_STATUSES } } }),
    prisma.order.count({
      where: {
        paymentMethod: "BANK_TRANSFER",
        paymentStatus: { not: "CAPTURED" },
        status: { notIn: ["CANCELLED", "REFUNDED"] },
        createdAt: { lt: new Date(now.getTime() - STALE_TRANSFER_DAYS * DAY) },
      },
    }),
    prisma.order.count({
      where: {
        status: "SHIPPED",
        shippingMethod: "PICKUP",
        shippedAt: { lt: new Date(now.getTime() - PICKUP_HOLD_DAYS * DAY) },
      },
    }),
    prisma.order.count({
      where: {
        status: "SHIPPED",
        shippingMethod: { not: "PICKUP" },
        shippedAt: { lt: new Date(now.getTime() - STALE_SHIPMENT_DAYS * DAY) },
      },
    }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { isRead: false } }),
    prisma.productVariant.count({ where: lowStockWhere }),
    prisma.product.count({ where: { status: "ACTIVE", images: { none: {} } } }),
    prisma.order.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      take: 7,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalPln: true,
        status: true,
        shippingMethod: true,
        createdAt: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { ...salesWhere, createdAt: { gte: rangeStart } } },
      _sum: { quantity: true, totalPln: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 6,
    }),
  ]);

  // Bucket by shop-local day so late-evening orders land on the right date
  const buckets = new Map<string, { totalPln: number; orders: number }>();
  for (const o of sales) {
    const b = buckets.get(dayKey(o.createdAt)) ?? { totalPln: 0, orders: 0 };
    b.totalPln += o.totalPln;
    b.orders += 1;
    buckets.set(dayKey(o.createdAt), b);
  }
  const days: RevenueDay[] = dayKeys.map((key) => ({
    key,
    label: new Date(`${key}T12:00:00Z`).toLocaleDateString("pl-PL", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
    }),
    ...(buckets.get(key) ?? { totalPln: 0, orders: 0 }),
  }));

  const profit = summarizeProfit(sales.map(toProfitOrder));
  const prevProfit = summarizeProfit(prevSales.map(toProfitOrder));
  const revenue = profit.revenuePln;
  const orderCount = profit.orders;
  const margin = marginPercent(profit);
  const today = days.at(-1) ?? { totalPln: 0, orders: 0 };

  const todos: {
    count: number;
    label: string;
    href: string;
    icon: LucideIcon;
    urgent?: boolean;
  }[] = [
    {
      count: toPack,
      label: "Zamówienia do spakowania",
      href: "/admin/zamowienia?widok=do-spakowania",
      icon: PackageCheck,
      urgent: true,
    },
    {
      count: staleTransfers,
      label: `Przelewy czekające ponad ${STALE_TRANSFER_DAYS} dni`,
      href: "/admin/zamowienia/przelewy",
      icon: Landmark,
    },
    {
      count: pickupOverdue,
      label: `Odbiory osobiste czekające ponad ${PICKUP_HOLD_DAYS} dni`,
      href: "/admin/zamowienia?widok=wyslane&dostawa=PICKUP",
      icon: Store,
    },
    {
      count: staleShipments,
      label: `Przesyłki bez potwierdzenia doręczenia (${STALE_SHIPMENT_DAYS}+ dni)`,
      href: "/admin/zamowienia?widok=wyslane",
      icon: Truck,
    },
    { count: pendingReviews, label: "Opinie do moderacji", href: "/admin/opinie", icon: Star },
    {
      count: unreadMessages,
      label: "Nieprzeczytane wiadomości",
      href: "/admin/wiadomosci",
      icon: Mail,
    },
    {
      count: lowStock,
      label: "Warianty z niskim stanem",
      href: "/admin/magazyn",
      icon: AlertTriangle,
    },
    {
      count: activeNoImage,
      label: "Aktywne produkty bez zdjęcia",
      href: "/admin/produkty?status=ACTIVE&zdjecie=__brak__",
      icon: ImageOff,
    },
  ].filter((t) => t.count > 0);

  const hour = Number(
    now.toLocaleTimeString("en-GB", { timeZone: SHOP_TZ, hour: "2-digit", hour12: false }),
  );
  const greeting = hour < 12 ? "Dzień dobry" : hour < 18 ? "Cześć" : "Dobry wieczór";

  return (
    <div className="space-y-6">
      <PageHeader
        title={greeting}
        description={
          todos.length
            ? `Masz ${todos.length} ${pluralPl(todos.length, "sprawę", "sprawy", "spraw")} do załatwienia.`
            : "Wszystko załatwione — nic nie czeka."
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Stat
              label="Dziś"
              value={formatPrice(today.totalPln)}
              sub={`${today.orders} ${pluralPl(today.orders, "zamówienie", "zamówienia", "zamówień")}`}
            />
            <Stat
              label={`Sprzedaż (${RANGE_DAYS} dni)`}
              value={formatPrice(revenue)}
              current={revenue}
              previous={prevProfit.revenuePln}
            />
            <Stat
              label={`Zamówienia (${RANGE_DAYS} dni)`}
              value={String(orderCount)}
              current={orderCount}
              previous={prevProfit.orders}
            />
            <Link
              href="/admin/wyniki"
              className="rounded-2xl transition-shadow hover:shadow-card-hover"
            >
              <Stat
                label={`Marża (${RANGE_DAYS} dni)`}
                value={formatPrice(profit.marginPln)}
                current={profit.marginPln}
                previous={prevProfit.marginPln}
                sub={margin === null ? "Brak cen zakupu" : `${margin}% · szczegóły w Wynikach`}
              />
            </Link>
          </div>

          <Panel title={`Wartość zamówień — ostatnie ${RANGE_DAYS} dni`}>
            <RevenueChart days={days} />
          </Panel>

          <Panel
            title="Ostatnie zamówienia"
            actions={
              <Link
                href="/admin/zamowienia"
                className="text-xs font-medium text-primary hover:underline"
              >
                Wszystkie
              </Link>
            }
            bodyClassName="px-2 pb-2"
          >
            <ul>
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/zamowienia/${o.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 motion-reduce:transition-none"
                  >
                    <span className="w-32 shrink-0 font-medium tabular-nums">{o.orderNumber}</span>
                    <span className="min-w-0 flex-1 truncate">{o.customerName}</span>
                    <span className="hidden sm:block">
                      <OrderStatusBadge status={o.status} shippingMethod={o.shippingMethod} />
                    </span>
                    <span className="hidden w-28 text-right text-xs text-muted-foreground md:block">
                      {relativeDate(o.createdAt, now)}
                    </span>
                    <span className="w-24 text-right font-medium tabular-nums">
                      {formatPrice(o.totalPln)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Work queue first on phones, sidebar column on desktop */}
        <div className="order-first space-y-6 lg:order-none">
          <Panel title="Do zrobienia" bodyClassName="px-2 pb-2">
            {todos.length === 0 ? (
              <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-success" aria-hidden />
                Nic nie czeka. Dobra robota.
              </p>
            ) : (
              <ul>
                {todos.map((t) => (
                  <li key={t.href + t.label}>
                    <Link
                      href={t.href}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 motion-reduce:transition-none"
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          t.urgent
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-primary",
                        )}
                      >
                        <t.icon className="size-4" aria-hidden />
                      </span>
                      <span className="flex-1">{t.label}</span>
                      <span className="min-w-6 rounded-full bg-muted px-2 text-center text-xs font-semibold tabular-nums leading-6">
                        {t.count}
                      </span>
                      <ChevronRight
                        className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Bestsellery (${RANGE_DAYS} dni)`}>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak sprzedaży w tym okresie.</p>
            ) : (
              <ol className="space-y-3">
                {topProducts.map((p, i) => {
                  const maxQty = topProducts[0]._sum.quantity ?? 1;
                  const qty = p._sum.quantity ?? 0;
                  return (
                    <li key={p.productName} className="text-sm">
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="w-4 text-xs text-muted-foreground tabular-nums">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{p.productName}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {qty} szt.
                        </span>
                      </div>
                      <div className="ml-6 h-1.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(qty / maxQty) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
