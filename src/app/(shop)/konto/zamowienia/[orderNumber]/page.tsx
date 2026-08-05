import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Szczegóły zamówienia — Well Botany" };

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

const SHIPPING_LABELS: Record<string, string> = {
  INPOST_PACZKOMAT: "InPost Paczkomat",
  DHL: "DHL",
  DPD: "DPD",
  COURIER: "Kurier",
  PICKUP: "Odbiór osobisty",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logowanie");

  const { orderNumber } = await params;

  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId: session.user.id },
    select: {
      orderNumber: true,
      status: true,
      createdAt: true,
      shippingMethod: true,
      shippingCostPln: true,
      inpostMachineName: true,
      shipFirstName: true,
      shipLastName: true,
      shipStreet: true,
      shipApartment: true,
      shipCity: true,
      shipPostalCode: true,
      shipPhone: true,
      subtotalPln: true,
      discountPln: true,
      shippingPln: true,
      taxPln: true,
      totalPln: true,
      couponCode: true,
      trackingNumber: true,
      trackingUrl: true,
      items: {
        select: {
          id: true,
          productName: true,
          variantOpt: true,
          sku: true,
          quantity: true,
          unitPricePln: true,
          totalPln: true,
        },
      },
    },
  });

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {order.createdAt.toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {order.trackingNumber && (
        <div className="rounded-2xl bg-card p-5 text-sm shadow-card">
          <p className="font-medium">Śledzenie przesyłki</p>
          <p className="text-muted-foreground">
            {order.trackingNumber}
            {order.trackingUrl && (
              <>
                {" — "}
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Śledź
                </a>
              </>
            )}
          </p>
        </div>
      )}

      {/* Items */}
      <div>
        <h2 className="mb-3 font-medium">Produkty</h2>
        <div className="divide-y divide-border rounded-2xl bg-card shadow-card">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{item.productName}</p>
                {item.variantOpt && (
                  <p className="text-xs text-muted-foreground">{item.variantOpt}</p>
                )}
                <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
              </div>
              <div className="text-right">
                <p>
                  {formatPrice(item.unitPricePln)} × {item.quantity}
                </p>
                <p className="font-medium">{formatPrice(item.totalPln)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Shipping */}
        <div>
          <h2 className="mb-2 font-medium">Dostawa</h2>
          <p className="text-sm text-muted-foreground">
            {SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod}
          </p>
          {order.inpostMachineName && (
            <p className="text-sm text-muted-foreground">{order.inpostMachineName}</p>
          )}
          <p className="mt-2 text-sm">
            {order.shipFirstName} {order.shipLastName}
          </p>
          <p className="text-sm text-muted-foreground">
            {order.shipStreet}
            {order.shipApartment ? ` / ${order.shipApartment}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {order.shipPostalCode} {order.shipCity}
          </p>
          {order.shipPhone && <p className="text-sm text-muted-foreground">{order.shipPhone}</p>}
        </div>

        {/* Summary */}
        <div>
          <h2 className="mb-2 font-medium">Podsumowanie</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produkty</span>
              <span>{formatPrice(order.subtotalPln)}</span>
            </div>
            {order.discountPln > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Rabat {order.couponCode ? `(${order.couponCode})` : ""}</span>
                <span>−{formatPrice(order.discountPln)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dostawa</span>
              <span>{formatPrice(order.shippingPln)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-medium">
              <span>Razem</span>
              <span>{formatPrice(order.totalPln)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
