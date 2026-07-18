import { notFound } from "next/navigation";
import { StatusForm } from "@/features/orders/components/StatusForm";
import { prisma } from "@/lib/prisma";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      customer: { select: { email: true, firstName: true, lastName: true } },
    },
  });

  if (!order) notFound();

  // Group gift-set component rows under their box label for packing clarity;
  // plain items ("" groupId) render individually, in original order.
  const seenGroups = new Set<string>();
  const orderedGroupIds: string[] = [];
  for (const item of order.items) {
    if (item.giftSetGroupId && !seenGroups.has(item.giftSetGroupId)) {
      seenGroups.add(item.giftSetGroupId);
      orderedGroupIds.push(item.giftSetGroupId);
    }
  }
  const itemRows = [
    ...order.items.filter((i) => !i.giftSetGroupId),
    ...orderedGroupIds.flatMap((groupId) =>
      order.items.filter((i) => i.giftSetGroupId === groupId),
    ),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <p className="text-sm text-muted-foreground">{order.createdAt.toLocaleString("pl-PL")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 font-semibold">Klient</h2>
          <p>{order.customerName}</p>
          <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
          {order.customerPhone && (
            <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
          )}
        </section>

        <section className="rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-3 font-semibold">Dostawa</h2>
          <p className="text-sm">
            {order.shipFirstName} {order.shipLastName}
          </p>
          <p className="text-sm">{order.shipStreet}</p>
          {order.shipApartment && <p className="text-sm">{order.shipApartment}</p>}
          <p className="text-sm">
            {order.shipPostalCode} {order.shipCity}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{order.shippingMethod}</p>
          {order.inpostMachineId && (
            <p className="text-sm text-muted-foreground">
              Paczkomat: {order.inpostMachineName ?? order.inpostMachineId}
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-3 font-semibold">Produkty</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Produkt</th>
              <th className="pb-2 font-medium">SKU</th>
              <th className="pb-2 font-medium">Ilość</th>
              <th className="pb-2 font-medium text-right">Cena</th>
            </tr>
          </thead>
          <tbody>
            {itemRows.map((item, i) => {
              const isFirstInGroup =
                item.giftSetGroupId !== "" &&
                (i === 0 || itemRows[i - 1].giftSetGroupId !== item.giftSetGroupId);
              return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">
                    {isFirstInGroup && (
                      <div className="mb-0.5">
                        <p className="text-xs font-semibold text-primary">🎁 {item.giftSetLabel}</p>
                        {item.packagingLabel && (
                          <p className="text-xs text-muted-foreground">
                            Opakowanie: {item.packagingLabel}
                          </p>
                        )}
                        {item.giftMessage && (
                          <p className="text-xs italic text-muted-foreground">
                            „{item.giftMessage}”
                          </p>
                        )}
                      </div>
                    )}
                    <span className={item.giftSetGroupId !== "" ? "pl-3" : ""}>
                      {item.productName}
                      {item.variantOpt && (
                        <span className="text-muted-foreground"> — {item.variantOpt}</span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 text-muted-foreground">{item.sku}</td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2 text-right">
                    {(item.totalPln / 100).toLocaleString("pl-PL", {
                      style: "currency",
                      currency: "PLN",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Produkty</span>
            <span>
              {(order.subtotalPln / 100).toLocaleString("pl-PL", {
                style: "currency",
                currency: "PLN",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dostawa</span>
            <span>
              {(order.shippingCostPln / 100).toLocaleString("pl-PL", {
                style: "currency",
                currency: "PLN",
              })}
            </span>
          </div>
          {order.discountPln > 0 && (
            <div className="flex justify-between text-success">
              <span>Rabat</span>
              <span>
                -
                {(order.discountPln / 100).toLocaleString("pl-PL", {
                  style: "currency",
                  currency: "PLN",
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>Razem</span>
            <span>
              {(order.totalPln / 100).toLocaleString("pl-PL", {
                style: "currency",
                currency: "PLN",
              })}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-4 font-semibold">Status i notatka</h2>
        <StatusForm orderId={order.id} currentStatus={order.status} currentNote={order.noteAdmin} />
      </section>
    </div>
  );
}
