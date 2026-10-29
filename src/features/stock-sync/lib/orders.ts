// Web orders for the shop agent to turn into Subiekt documents (EDI++ files),
// and the agent's report of which ones staff have since entered.
import { revalidateTag, unstable_cache } from "next/cache";
import { PAYMENT_LABELS } from "@/features/checkout/lib/payment";
import { shippingLabel } from "@/features/checkout/lib/shipping";
import { pickupLocation } from "@/lib/pickup-locations";
import { prisma } from "@/lib/prisma";
import { SUBIEKT_ORDERS_TAG } from "./orders-tag";

// Older ones were entered by hand before the sync; anything left that long needs a human anyway
const LOOKBACK_DAYS = 90;
const LIMIT = 200;

export type SubiektOrder = Awaited<ReturnType<typeof pendingSubiektOrders>>[number];

/** Orders that took stock but aren't in Subiekt yet, oldest first. */
export async function pendingSubiektOrders() {
  const orders = await prisma.order.findMany({
    where: {
      subiektEnteredAt: null,
      status: { notIn: ["PENDING", "CANCELLED"] },
      createdAt: { gte: new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "asc" },
    take: LIMIT,
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: { variant: { select: { ean: true } } },
      },
    },
  });

  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    paid: o.paymentStatus === "CAPTURED",
    paymentLabel: PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod,
    shippingLabel: shippingLabel(o.shippingMethod),
    pickupLocation: o.pickupLocation,
    pickupName: pickupLocation(o.pickupLocation)?.address ?? null,
    pointId: o.inpostMachineId,
    customer: {
      name: o.customerName,
      email: o.customerEmail,
      phone: o.shipPhone ?? o.customerPhone,
    },
    shipping: {
      name: `${o.shipFirstName} ${o.shipLastName}`.trim(),
      company: o.shipCompany,
      street: [o.shipStreet, o.shipApartment].filter(Boolean).join(" ") || null,
      city: o.shipCity,
      postalCode: o.shipPostalCode,
    },
    invoice: o.wantsFaktura
      ? {
          company: o.billCompany,
          nip: o.billNip,
          street: o.billStreet,
          city: o.billCity,
          postalCode: o.billPostalCode,
        }
      : null,
    note: o.noteCustomer,
    // All amounts in grosz, gross
    subtotalPln: o.subtotalPln,
    discountPln: o.discountPln,
    shippingPln: o.shippingPln,
    totalPln: o.totalPln,
    items: o.items.map((i) => ({
      sku: i.sku,
      ean: i.variant?.ean ?? null,
      name: i.variantOpt ? `${i.productName} ${i.variantOpt}` : i.productName,
      quantity: i.quantity,
      unitPricePln: i.unitPricePln,
      totalPln: i.totalPln,
      vatRate: Number(i.vatRate),
    })),
  }));
}

/** Marks orders the agent found in Subiekt. Already marked ones are left as they are. */
export async function markEnteredInSubiekt(orderNumbers: string[]): Promise<number> {
  const { count } = await prisma.order.updateMany({
    where: { orderNumber: { in: orderNumbers }, subiektEnteredAt: null },
    data: { subiektEnteredAt: new Date() },
  });
  if (count > 0) revalidateTag(SUBIEKT_ORDERS_TAG, { expire: 0 });
  return count;
}

// The agent polls every few minutes; serve that from Next's data cache so the
// poll doesn't wake Postgres. Order changes revalidate the tag; 15 min is the
// backstop for a change made somewhere that doesn't.
export const cachedPendingSubiektOrders = unstable_cache(
  pendingSubiektOrders,
  ["subiekt-pending-orders"],
  { tags: [SUBIEKT_ORDERS_TAG], revalidate: 900 },
);
