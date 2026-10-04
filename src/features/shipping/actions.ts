"use server";

import type { ShippingMethod } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { CARRIERS, SHIPPING_METHOD_KEYS } from "@/features/checkout/lib/shipping";
import { SHIPPING_RATES_TAG } from "@/features/checkout/lib/shipping-rates";
import { buildTrackingUrl } from "@/features/orders/lib/tracking-url";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import {
  createEpakaOrder,
  EpakaError,
  getEpakaLabelNumber,
  getEpakaPrices,
  getEpakaShippingDay,
} from "./lib/epaka";
import { buildEpakaOrderBody, DEFAULT_PACKAGE, SENDER } from "./lib/shipment";
import { createEpakaShipmentSchema, epakaOrderIdSchema, saveShippingRatesSchema } from "./schema";

/** epaka failures reach the admin as a toast instead of a generic server error. */
async function epaka<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof EpakaError) throw new ActionError(err.message);
    throw err;
  }
}

export const saveShippingRates = adminActionClient
  .schema(saveShippingRatesSchema)
  .action(async ({ parsedInput: { rates } }) => {
    if (!rates.some((r) => r.enabled)) {
      throw new ActionError("Włącz co najmniej jedną metodę dostawy");
    }
    await prisma.$transaction(
      rates.map(({ method, pricePln, enabled }) =>
        prisma.shippingRate.upsert({
          where: { method },
          update: { pricePln, enabled },
          create: { method, pricePln, enabled },
        }),
      ),
    );
    updateTag(SHIPPING_RATES_TAG);
    // Methods and prices show in the footer and on static pages (Dostawa, home)
    revalidatePath("/", "layout");
    return { success: true };
  });

/** Today's epaka price (grosz, gross) per method for the standard box; methods epaka can't quote are absent. */
export const loadEpakaPrices = adminActionClient.schema(z.object({})).action(async () => {
  const prices = await epaka(() =>
    getEpakaPrices({ ...DEFAULT_PACKAGE, type: 0 }, SENDER.postCode),
  );
  const byMethod: Partial<Record<(typeof SHIPPING_METHOD_KEYS)[number], number>> = {};
  for (const method of SHIPPING_METHOD_KEYS) {
    const id = CARRIERS[method].epakaCourierId;
    const price = id === null ? undefined : prices.get(id);
    if (price !== undefined) byMethod[method] = price;
  }
  return { prices: byMethod };
});

async function saveLabelNumber(
  orderId: string,
  epakaOrderId: number,
  shippingMethod: ShippingMethod,
) {
  const trackingNumber = await getEpakaLabelNumber(epakaOrderId);
  if (trackingNumber) {
    await prisma.order.update({
      where: { id: orderId },
      data: { trackingNumber, trackingUrl: buildTrackingUrl(shippingMethod, trackingNumber) },
    });
  }
  revalidatePath(`/admin/zamowienia/${orderId}`);
  return trackingNumber;
}

/** Orders the courier in epaka (paid from the account balance) and stores the waybill number. */
export const createEpakaShipment = adminActionClient
  .schema(createEpakaShipmentSchema)
  .action(async ({ parsedInput: input }) => {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: { orderNumber: true, shippingMethod: true, epakaOrderId: true },
    });
    if (!order) throw new ActionError("Zamówienie nie istnieje");
    if (order.epakaOrderId) throw new ActionError("Przesyłka w epaka została już utworzona");
    const carrier =
      order.shippingMethod in CARRIERS
        ? CARRIERS[order.shippingMethod as keyof typeof CARRIERS]
        : null;
    const courierId = carrier?.epakaCourierId;
    if (!courierId) throw new ActionError("Ta metoda dostawy nie jest wysyłana przez epaka");

    return epaka(async () => {
      const day = await getEpakaShippingDay(courierId, SENDER.postCode);
      if (!day) throw new ActionError("epaka nie podała dnia nadania dla tego przewoźnika");
      if (!input.senderPoint && !day.slot) {
        throw new ActionError("Ten przewoźnik nie odbiera paczek — wybierz nadanie w punkcie");
      }
      // Drop-off still needs a slot in the request; epaka accepts working hours then
      const pickup = { date: day.date, ...(day.slot ?? { from: "09:00", to: "17:00" }) };
      const created = await createEpakaOrder(
        buildEpakaOrderBody({
          courierId,
          receiver: input.receiver,
          package: input.package,
          pickup,
          senderPoint: input.senderPoint,
          orderNumber: order.orderNumber,
        }),
      );
      // Saved before anything else can fail — the shipment is already paid for
      await prisma.order.update({
        where: { id: input.orderId },
        data: { epakaOrderId: created.orderId },
      });
      const trackingNumber = await saveLabelNumber(
        input.orderId,
        created.orderId,
        order.shippingMethod,
      );
      return {
        epakaOrderId: created.orderId,
        result: created.result,
        message: created.message,
        trackingNumber,
      };
    });
  });

/** Re-reads the waybill number — epaka may assign it a moment after the order. */
export const refreshEpakaShipment = adminActionClient
  .schema(epakaOrderIdSchema)
  .action(async ({ parsedInput: { orderId } }) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { epakaOrderId: true, shippingMethod: true },
    });
    if (!order?.epakaOrderId) throw new ActionError("Brak przesyłki epaka dla tego zamówienia");
    const { epakaOrderId, shippingMethod } = order;
    const trackingNumber = await epaka(() =>
      saveLabelNumber(orderId, epakaOrderId, shippingMethod),
    );
    return { trackingNumber };
  });
