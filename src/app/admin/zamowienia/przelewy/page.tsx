import type { Metadata } from "next";
import { PageHeader, relativeDate } from "@/app/admin/components/ui";
import { TransferReconciler } from "@/features/orders/components/TransferReconciler";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Rozlicz przelewy" };

export default async function TransferReconcilePage() {
  const unpaid = await prisma.order.findMany({
    where: {
      paymentMethod: "BANK_TRANSFER",
      paymentStatus: { not: "CAPTURED" },
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      totalPln: true,
      createdAt: true,
    },
  });

  const now = new Date();

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/zamowienia", label: "Zamówienia" }}
        title="Rozlicz przelewy"
        description="Wklej wyciąg lub historię z banku — dopasujemy numery zamówień z tytułów przelewów do nieopłaconych zamówień i sprawdzimy kwoty. Nic nie jest wysyłane poza panel."
      />
      <TransferReconciler
        orders={unpaid.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          totalPln: o.totalPln,
          ageLabel: relativeDate(o.createdAt, now),
          ageDays: Math.floor((now.getTime() - o.createdAt.getTime()) / 86400000),
        }))}
      />
    </div>
  );
}
