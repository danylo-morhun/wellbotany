// Polls epaka for every parcel still on its way (wb-shipment-tracking timer,
// every 30 min) and moves the order along on its own:
//   courier scanned the parcel → SHIPPED (customer gets the tracking e-mail)
//   delivered / collected      → DELIVERED (review request follows)
//   return, wrong address, …   → shipmentAlert + e-mail to the shop, once
//   label bought, no scan by the end of the next working day → "not_handed_over" alert
import type { OrderStatus } from "@prisma/client";
import { applyOrderStatus } from "@/features/orders/lib/apply-status";
import { buildTrackingUrl } from "@/features/orders/lib/tracking-url";
import { sendShipmentAlertEmail } from "@/lib/email/order-emails";
import { prisma } from "@/lib/prisma";
import { type EpakaPackageStatus, getEpakaLabelNumber, getEpakaOrderStatus } from "./epaka";
import { handOverDeadline, NOT_HANDED_OVER, PACKAGE_STATUS_LABELS } from "./shipment-status";

const LOOKBACK_DAYS = 45;

/** Parcel is with the carrier (or waiting for the customer at a point) */
const MOVING: ReadonlySet<string> = new Set<EpakaPackageStatus>([
  "package_received_from_sender",
  "package_on_transit",
  "package_in_delivery",
  "package_sending_in_point",
  "package_waiting_in_point",
  "package_sending_in_paczkomat",
  "package_waiting_in_paczkomat",
]);

const PROBLEM: ReadonlySet<string> = new Set<EpakaPackageStatus>([
  "package_delivery_problem",
  "package_damaged",
  "wrong_address",
  "return_to_sender",
]);

type Result = { orderNumber: string; change: string };

export async function syncShipments(now = new Date()): Promise<{
  checked: number;
  changes: Result[];
  failed: string[];
}> {
  const orders = await prisma.order.findMany({
    where: {
      epakaOrderId: { not: null },
      status: { in: ["PAID", "PROCESSING", "SHIPPED"] },
      createdAt: { gte: new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000) },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      epakaOrderId: true,
      shippingMethod: true,
      trackingNumber: true,
      labelCreatedAt: true,
      shipmentStatus: true,
      shipmentAlert: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const changes: Result[] = [];
  const failed: string[] = [];

  for (const order of orders) {
    try {
      const epakaOrderId = order.epakaOrderId as number;
      const { packageStatus } = await getEpakaOrderStatus(epakaOrderId);

      // The waybill number can come a moment after the label — needed for SHIPPED
      let trackingNumber = order.trackingNumber;
      if (!trackingNumber) {
        trackingNumber = await getEpakaLabelNumber(epakaOrderId);
        if (trackingNumber) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              trackingNumber,
              trackingUrl: buildTrackingUrl(order.shippingMethod, trackingNumber),
            },
          });
        }
      }

      if (packageStatus !== order.shipmentStatus) {
        await prisma.order.update({
          where: { id: order.id },
          data: { shipmentStatus: packageStatus, shipmentStatusAt: now },
        });
      }

      const status: OrderStatus = order.status;
      const toShipped = async () => {
        if (status === "SHIPPED" || !trackingNumber) return false;
        await applyOrderStatus({ orderId: order.id, status: "SHIPPED", trackingNumber }, "route");
        return true;
      };
      const setAlert = async (alert: string | null) => {
        if (alert === order.shipmentAlert) return;
        await prisma.order.update({ where: { id: order.id }, data: { shipmentAlert: alert } });
        if (alert) {
          await sendShipmentAlertEmail(order.id, PACKAGE_STATUS_LABELS[alert] ?? alert);
          changes.push({ orderNumber: order.orderNumber, change: `alert:${alert}` });
        }
      };

      if (packageStatus === "package_delivered") {
        await toShipped();
        // DELIVERED clears the alert itself
        await applyOrderStatus({ orderId: order.id, status: "DELIVERED" }, "route");
        changes.push({ orderNumber: order.orderNumber, change: "DELIVERED" });
      } else if (packageStatus && PROBLEM.has(packageStatus)) {
        if (await toShipped()) changes.push({ orderNumber: order.orderNumber, change: "SHIPPED" });
        await setAlert(packageStatus);
      } else if (packageStatus && MOVING.has(packageStatus)) {
        if (await toShipped()) changes.push({ orderNumber: order.orderNumber, change: "SHIPPED" });
        await setAlert(null);
      } else if (
        status !== "SHIPPED" &&
        order.labelCreatedAt &&
        now > handOverDeadline(order.labelCreatedAt)
      ) {
        await setAlert(NOT_HANDED_OVER);
      }
    } catch (err) {
      console.error(`[shipment-tracking] ${order.orderNumber}:`, err);
      failed.push(order.orderNumber);
    }
  }

  return { checked: orders.length, changes, failed };
}
