import { z } from "zod";
import { SHIPPING_METHOD_KEYS } from "@/features/checkout/lib/shipping";

export const saveShippingRatesSchema = z.object({
  rates: z
    .array(
      z.object({
        method: z.enum(SHIPPING_METHOD_KEYS),
        // Grosz
        pricePln: z.number().int().min(0).max(100_000),
        enabled: z.boolean(),
      }),
    )
    .min(1),
});

const postCode = z.string().regex(/^\d{2}-\d{3}$/, "Kod pocztowy w formacie 00-000");

export const createEpakaShipmentSchema = z.object({
  orderId: z.string().min(1),
  receiver: z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    company: z.string().trim().max(100).optional(),
    street: z.string().trim().min(1, "Podaj ulicę").max(100),
    houseNumber: z.string().trim().min(1, "Podaj numer domu").max(20),
    flatNumber: z.string().trim().max(20).optional(),
    postCode,
    city: z.string().trim().min(1).max(60),
    phone: z.string().trim().min(9).max(20),
    email: z.string().email(),
    pointId: z.string().trim().max(60).optional(),
    pointDescription: z.string().trim().max(200).optional(),
  }),
  package: z.object({
    weight: z.number().positive().max(30),
    length: z.number().positive().max(200),
    width: z.number().positive().max(200),
    height: z.number().positive().max(200),
  }),
  /** Carrier point where the parcel is dropped off; absent = courier collects from the door */
  senderPoint: z
    .object({
      id: z.string().trim().min(1).max(60),
      description: z.string().trim().min(1).max(200),
    })
    .optional(),
});

export const epakaOrderIdSchema = z.object({ orderId: z.string().min(1) });

export type CreateEpakaShipmentInput = z.input<typeof createEpakaShipmentSchema>;
