import type { OrderStatus } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyField } from "@/app/admin/components/CopyButton";
import {
  formatDateTime,
  OrderStatusBadge,
  PageHeader,
  Panel,
  relativeDate,
  table,
} from "@/app/admin/components/ui";
import { Badge } from "@/components/ui/badge";
import { shippingLabel } from "@/features/checkout/lib/shipping";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const NOT_SALES: OrderStatus[] = ["PENDING", "CANCELLED", "REFUNDED"];

type Props = { params: Promise<{ key: string }> };

/** Route key is an e-mail (any buyer, guests too) or a Customer id (from search) */
async function resolveEmail(key: string): Promise<string | null> {
  // Next may hand over the segment already decoded; a literal "%" would make a second decode throw
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {}
  if (decoded.includes("@")) return decoded;
  const customer = await prisma.customer.findUnique({
    where: { id: decoded },
    select: { email: true },
  });
  return customer?.email ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const email = await resolveEmail((await params).key);
  return { title: email ?? "Klient" };
}

export default async function AdminCustomerPage({ params }: Props) {
  const email = await resolveEmail((await params).key);
  if (!email) notFound();

  const emailMatch = { equals: email, mode: "insensitive" as const };
  const [customer, orders, subscriber, topItems] = await Promise.all([
    prisma.customer.findFirst({
      where: { email: emailMatch },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        companyName: true,
        nip: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: { customerEmail: emailMatch },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        shippingMethod: true,
        totalPln: true,
        createdAt: true,
        customerName: true,
        customerPhone: true,
        shipStreet: true,
        shipPostalCode: true,
        shipCity: true,
        inpostMachineId: true,
      },
    }),
    prisma.newsletterSubscriber.findFirst({ where: { email: emailMatch } }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { customerEmail: emailMatch, status: { notIn: NOT_SALES } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
  ]);

  if (!customer && orders.length === 0) notFound();

  const sales = orders.filter((o) => !NOT_SALES.includes(o.status));
  const ltv = sales.reduce((s, o) => s + o.totalPln, 0);
  const latest = orders[0];
  const name =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    latest?.customerName ||
    email;
  const now = new Date();
  const lastAddress = orders.find((o) => o.shipStreet);

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/klienci", label: "Klienci" }}
        title={name}
        meta={
          <>
            {customer ? <Badge tone="primary">konto</Badge> : <Badge>gość</Badge>}
            {subscriber && <Badge tone="info">newsletter</Badge>}
          </>
        }
        description={email}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Zamówienia", String(sales.length)],
          ["Łączna wartość", formatPrice(ltv)],
          ["Średni koszyk", formatPrice(sales.length ? Math.round(ltv / sales.length) : 0)],
          ["Ostatnie zamówienie", latest ? relativeDate(latest.createdAt, now) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-card p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={table.wrap}>
          <table className={table.table}>
            <thead className={table.thead}>
              <tr>
                <th className={table.th}>Zamówienie</th>
                <th className={table.th}>Status</th>
                <th className={table.th}>Dostawa</th>
                <th className={`${table.th} text-right`}>Kwota</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={table.tr}>
                  <td className={`${table.td} py-2.5`}>
                    <Link
                      href={`/admin/zamowienia/${o.id}`}
                      className="font-medium tabular-nums hover:text-primary"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                  </td>
                  <td className={table.td}>
                    <OrderStatusBadge status={o.status} shippingMethod={o.shippingMethod} />
                  </td>
                  <td className={`${table.td} text-muted-foreground`}>
                    {shippingLabel(o.shippingMethod)}
                  </td>
                  <td className={`${table.td} text-right font-medium tabular-nums`}>
                    {formatPrice(o.totalPln)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <Panel title="Kontakt">
            <div className="divide-y divide-border/60">
              <CopyField label="E-mail" value={email} />
              <CopyField label="Telefon" value={customer?.phone ?? latest?.customerPhone} />
              {lastAddress && (
                <CopyField
                  label="Ostatni adres"
                  value={`${lastAddress.shipStreet}, ${lastAddress.shipPostalCode} ${lastAddress.shipCity}`}
                />
              )}
              <CopyField label="Firma" value={customer?.companyName} />
              <CopyField label="NIP" value={customer?.nip} />
            </div>
            {customer && (
              <p className="mt-3 text-xs text-muted-foreground">
                Konto od {formatDateTime(customer.createdAt)}
              </p>
            )}
          </Panel>

          {topItems.length > 0 && (
            <Panel title="Najczęściej kupuje">
              <ul className="space-y-2 text-sm">
                {topItems.map((i) => (
                  <li key={i.productName} className="flex items-baseline gap-3">
                    <span className="min-w-0 flex-1 truncate">{i.productName}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {i._sum.quantity} szt.
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
