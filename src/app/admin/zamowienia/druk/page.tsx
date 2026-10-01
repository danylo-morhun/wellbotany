import type { Metadata } from "next";
import { formatDateTime } from "@/app/admin/components/ui";
import { PAYMENT_LABELS } from "@/features/checkout/lib/payment";
import { shippingLabel } from "@/features/checkout/lib/shipping";
import { PrintButton } from "@/features/orders/components/PrintButton";
import { formatPrice, pluralPl } from "@/lib/format";
import { pickupLocation } from "@/lib/pickup-locations";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Listy pakowania" };

type Props = { searchParams: Promise<{ ids?: string }> };

export default async function PackingSlipsPage({ searchParams }: Props) {
  const { ids: raw } = await searchParams;
  const ids = (raw ?? "").split(",").filter(Boolean).slice(0, 100);

  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    orderBy: { createdAt: "asc" },
    include: { items: { orderBy: [{ giftSetGroupId: "asc" }, { createdAt: "asc" }] } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Listy pakowania</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} {pluralPl(orders.length, "zamówienie", "zamówienia", "zamówień")} ·
            każde na osobnej stronie
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="space-y-6 print:space-y-0">
        {orders.map((order) => {
          const pickup = pickupLocation(order.pickupLocation);
          const units = order.items.reduce((s, i) => s + i.quantity, 0);
          let lastGroup = "";
          return (
            <article
              key={order.id}
              className="rounded-2xl bg-card p-8 text-sm shadow-card print:break-after-page print:rounded-none print:p-0 print:shadow-none"
            >
              <header className="mb-6 flex items-start justify-between gap-6 border-b border-border pb-4">
                <div>
                  <p className="font-heading text-2xl font-semibold tabular-nums">
                    {order.orderNumber}
                  </p>
                  <p className="text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{shippingLabel(order.shippingMethod)}</p>
                  <p className="text-muted-foreground">
                    {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod} ·{" "}
                    {order.paymentStatus === "CAPTURED" ? "opłacone" : "NIEOPŁACONE"}
                  </p>
                </div>
              </header>

              <div className="mb-6 grid grid-cols-2 gap-6">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Odbiorca</p>
                  <p className="font-medium">
                    {order.shipFirstName} {order.shipLastName}
                  </p>
                  {order.shipCompany && <p>{order.shipCompany}</p>}
                  {order.shipStreet && (
                    <p>
                      {order.shipStreet} {order.shipApartment}
                    </p>
                  )}
                  {order.shipPostalCode && (
                    <p>
                      {order.shipPostalCode} {order.shipCity}
                    </p>
                  )}
                  <p>{order.shipPhone ?? order.customerPhone}</p>
                  <p>{order.customerEmail}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Punkt / odbiór</p>
                  {order.shippingMethod === "PICKUP" ? (
                    <p className="font-medium">{pickup?.address ?? order.pickupLocation}</p>
                  ) : order.inpostMachineId ? (
                    <>
                      <p className="font-heading text-xl font-semibold">{order.inpostMachineId}</p>
                      {order.inpostMachineName && <p>{order.inpostMachineName}</p>}
                    </>
                  ) : (
                    <p className="text-muted-foreground">Dostawa pod adres</p>
                  )}
                  {order.wantsFaktura && (
                    <p className="mt-2 font-medium">Faktura VAT: {order.billNip}</p>
                  )}
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="w-8 pb-2" />
                    <th className="pb-2 font-medium">Produkt</th>
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 text-right font-medium">Ilość</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.flatMap((item) => {
                    const rows = [];
                    if (item.giftSetGroupId && item.giftSetGroupId !== lastGroup) {
                      rows.push(
                        <tr key={`${item.giftSetGroupId}-h`}>
                          <td />
                          <td colSpan={3} className="pt-3 pb-1 font-semibold">
                            🎁 {item.giftSetLabel}
                            {item.packagingLabel && ` · ${item.packagingLabel}`}
                            {item.giftMessage && (
                              <span className="block font-normal italic">
                                Bilecik: „{item.giftMessage}”
                              </span>
                            )}
                          </td>
                        </tr>,
                      );
                    }
                    lastGroup = item.giftSetGroupId;
                    rows.push(
                      <tr key={item.id} className="border-b border-border/60">
                        <td className="py-2">
                          <span className="block size-4 rounded border border-foreground/40" />
                        </td>
                        <td className={`py-2 ${item.giftSetGroupId ? "pl-4" : ""}`}>
                          {item.productName}
                          {item.variantOpt && (
                            <span className="text-muted-foreground"> — {item.variantOpt}</span>
                          )}
                        </td>
                        <td className="py-2 font-mono text-xs">{item.sku}</td>
                        <td
                          className={`py-2 text-right tabular-nums ${item.quantity > 1 ? "text-base font-bold" : ""}`}
                        >
                          {item.quantity}
                        </td>
                      </tr>,
                    );
                    return rows;
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-right text-muted-foreground">
                Razem sztuk: <span className="font-semibold text-foreground">{units}</span> ·
                Wartość: {formatPrice(order.totalPln)}
              </p>

              {(order.noteCustomer || order.noteAdmin) && (
                <div className="mt-6 space-y-2 border-t border-border pt-4">
                  {order.noteCustomer && (
                    <p>
                      <span className="font-semibold">Uwagi klienta:</span> {order.noteCustomer}
                    </p>
                  )}
                  {order.noteAdmin && (
                    <p>
                      <span className="font-semibold">Notatka:</span> {order.noteAdmin}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
