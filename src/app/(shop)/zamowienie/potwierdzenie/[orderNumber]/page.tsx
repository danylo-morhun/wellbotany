import { CheckCircle, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Zamówienie ${orderNumber} — Well Botany` };
}

export default async function PotwierdzeniePage({ params }: Props) {
  const { orderNumber } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      customerEmail: true,
      customerName: true,
      shippingMethod: true,
      inpostMachineId: true,
      shipCity: true,
      shipPostalCode: true,
      paymentMethod: true,
      subtotalPln: true,
      shippingPln: true,
      discountPln: true,
      totalPln: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          variantOpt: true,
          quantity: true,
          unitPricePln: true,
          totalPln: true,
        },
      },
    },
  });

  if (!order) notFound();

  const shippingLabel: Record<string, string> = {
    INPOST_PACZKOMAT: "InPost Paczkomat",
    DHL: "DHL Kurier",
    DPD: "DPD Kurier",
  };

  const paymentLabel: Record<string, string> = {
    BLIK: "BLIK",
    PRZELEWY24: "Przelew online",
    APPLE_PAY: "Apple Pay",
    GOOGLE_PAY: "Google Pay",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        {order.paymentStatus === "CAPTURED" ? (
          <CheckCircle className="size-12 text-green-500" />
        ) : (
          <Clock className="size-12 text-amber-500" />
        )}
        <h1 className="text-balance text-2xl">
          {order.paymentStatus === "CAPTURED" ? "Zamówienie opłacone!" : "Zamówienie złożone!"}
        </h1>
        <p className="text-muted-foreground">
          Numer zamówienia:{" "}
          <span className="font-semibold text-foreground">{order.orderNumber}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Potwierdzenie zostało wysłane na adres{" "}
          <span className="font-medium text-foreground">{order.customerEmail}</span>
        </p>
      </div>

      {order.paymentStatus !== "CAPTURED" && (
        <div className="mb-6 rounded-xl bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
          Czekamy na potwierdzenie płatności (
          {paymentLabel[order.paymentMethod] ?? order.paymentMethod}). Po zaksięgowaniu rozpoczniemy
          realizację zamówienia.
        </div>
      )}

      <div className="space-y-4 rounded-2xl bg-card p-6 shadow-card">
        <h2 className="font-semibold">Szczegóły zamówienia</h2>

        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-3 text-sm">
              <span>
                {item.productName}
                {item.variantOpt ? ` (${item.variantOpt})` : ""} × {item.quantity}
              </span>
              <span>{formatPrice(item.totalPln)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Produkty</span>
            <span>{formatPrice(order.subtotalPln)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Dostawa ({shippingLabel[order.shippingMethod] ?? order.shippingMethod})</span>
            <span>{formatPrice(order.shippingPln)}</span>
          </div>
          {order.discountPln > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Rabat</span>
              <span>−{formatPrice(order.discountPln)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Łącznie</span>
            <span>{formatPrice(order.totalPln)}</span>
          </div>
        </div>

        {order.inpostMachineId && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            Paczkomat: <span className="font-medium">{order.inpostMachineId}</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/katalog"
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-deep motion-reduce:transition-none"
        >
          Kontynuuj zakupy
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Strona główna
        </Link>
      </div>
    </div>
  );
}
