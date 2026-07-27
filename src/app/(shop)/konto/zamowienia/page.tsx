import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Zamówienia — Twoje Zdrowie" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Oczekujące",
  PAYMENT_PENDING: "Oczekiwanie na płatność",
  PAID: "Opłacone",
  PROCESSING: "W realizacji",
  SHIPPED: "Wysłane",
  DELIVERED: "Dostarczone",
  CANCELLED: "Anulowane",
  REFUNDED: "Zwrócone",
};

export default async function ZamowieniaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/logowanie");

  const orders = await prisma.order.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalPln: true,
      createdAt: true,
      items: { select: { productName: true }, take: 4 },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Zamówienia</h1>

      {orders.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-10 text-center shadow-card">
          <PackageSearch className="size-12 text-muted-foreground" />
          <h2 className="text-balance text-lg font-medium">
            Nie złożyłeś jeszcze żadnego zamówienia
          </h2>
          <p className="text-sm text-muted-foreground">
            Twoje zamówienia pojawią się tutaj, gdy tylko coś kupisz.
          </p>
          <Link
            href="/katalog"
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-deep motion-reduce:transition-none"
          >
            Przejdź do katalogu
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/konto/zamowienia/${order.orderNumber}`}
            className="flex flex-col gap-1 rounded-2xl bg-card p-4 shadow-card transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                {order.createdAt.toLocaleDateString("pl-PL")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {order.items
                  .slice(0, 3)
                  .map((i) => i.productName)
                  .join(", ")}
                {order.items.length > 3 ? "…" : ""}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
              <span className="font-medium">{formatPrice(order.totalPln)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
