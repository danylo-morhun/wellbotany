import { AlertTriangle, Clock, ShoppingBag, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayOrders, pendingOrders, lowStock, revenueResult] =
    await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({
        where: { status: { in: ["PENDING", "PAID", "PROCESSING"] } },
      }),
      prisma.productVariant.count({
        where: { stock: { lte: 5, gt: 0 }, trackStock: true },
      }),
      prisma.order.aggregate({
        where: {
          paymentStatus: "CAPTURED",
          createdAt: { gte: monthStart },
        },
        _sum: { totalPln: true },
      }),
    ]);

  const kpis = [
    {
      label: "Zamówienia dziś",
      value: todayOrders,
      icon: ShoppingBag,
      href: "/admin/zamowienia",
    },
    {
      label: "Oczekujące",
      value: pendingOrders,
      icon: Clock,
      href: "/admin/zamowienia?status=PENDING",
    },
    {
      label: "Niski stan mag.",
      value: lowStock,
      icon: AlertTriangle,
      href: "/admin/magazyn",
    },
    {
      label: "Przychód (mies.)",
      value: formatPrice(revenueResult._sum.totalPln ?? 0),
      icon: TrendingUp,
      href: null,
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, href }) => {
          const cardClass =
            "rounded-2xl bg-card p-5 shadow-card transition-[box-shadow,transform] duration-200 ease-out motion-reduce:transition-none";
          const inner = (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {label}
                </span>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </>
          );
          return href ? (
            <Link
              key={label}
              href={href}
              className={`${cardClass} hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:hover:translate-y-0`}
            >
              {inner}
            </Link>
          ) : (
            <div key={label} className={cardClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
