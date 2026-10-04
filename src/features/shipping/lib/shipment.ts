// Pure rules for turning a shop order into an epaka shipment.

/** Shop as sender — legal data mirrors src/lib/seo.ts (organization JSON-LD). */
export const SENDER = {
  name: "Well",
  lastName: "Botany",
  company: "Zielarnia Kaliska II Sp. z o.o.",
  nip: "6182203142",
  country: "PL",
  city: "Kalisz",
  street: "Polna",
  houseNumber: "102",
  postCode: "62-800",
  phone: "+48797771703",
  email: "kontakt@wellbotany.pl",
};

/** Box 30×20×10 cm, 1 kg — the size epaka prices were agreed on (2026-09-26). */
export const DEFAULT_PACKAGE = { weight: 1, length: 30, width: 20, height: 10 } as const;

/**
 * Splits a one-line street ("ul. Kościuszki 1a/5") into the street, house and
 * flat numbers epaka asks for separately. No number found → house number empty.
 */
export function splitStreet(line: string): {
  street: string;
  houseNumber: string;
  flatNumber: string;
} {
  const match = line.trim().match(/^(.*?)\s+(\d+[a-zA-Z]?)(?:\s*(?:\/|m\.?|lok\.?)\s*(\w+))?$/);
  if (!match) return { street: line.trim(), houseNumber: "", flatNumber: "" };
  return { street: match[1], houseNumber: match[2], flatNumber: match[3] ?? "" };
}

/**
 * Point address from the name saved at checkout ("PL82690 — Ostrowska 53B, 62-800 Kalisz",
 * see PointPicker) — epaka can't look up every carrier's point by its code.
 */
export function parsePointAddress(
  savedName: string | null,
): { street: string; postCode: string; city: string } | null {
  const match = savedName?.match(/—\s*(.+?),\s*(\d{2}-\d{3})\s+(.+)$/);
  return match ? { street: match[1].trim(), postCode: match[2], city: match[3].trim() } : null;
}

export type ShipmentReceiver = {
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  houseNumber: string;
  flatNumber?: string;
  postCode: string;
  city: string;
  phone: string;
  email: string;
  /** Carrier point code for point delivery */
  pointId?: string;
  /** Point name — epaka requires it next to the code */
  pointDescription?: string;
};

export type ShipmentInput = {
  courierId: number;
  receiver: ShipmentReceiver;
  package: { weight: number; length: number; width: number; height: number };
  /** Shipping day (ISO date) and the courier's collection slot */
  pickup: { date: string; from: string; to: string };
  /** Carrier point where the parcel is dropped off; absent = courier collects from the door */
  senderPoint?: { id: string; description: string };
  orderNumber: string;
};

/** Request body for POST /v1/order, paid from the epaka account balance. */
export function buildEpakaOrderBody(input: ShipmentInput) {
  const r = input.receiver;
  return {
    courierId: input.courierId,
    shippingType: "package",
    sender: {
      ...SENDER,
      ...(input.senderPoint && {
        pointId: input.senderPoint.id,
        pointDescription: input.senderPoint.description,
      }),
    },
    receiver: {
      name: r.firstName,
      lastName: r.lastName,
      ...(r.company && { company: r.company }),
      country: "PL",
      city: r.city,
      street: r.street,
      houseNumber: r.houseNumber,
      ...(r.flatNumber && { flatNumber: r.flatNumber }),
      postCode: r.postCode,
      phone: r.phone,
      email: r.email,
      ...(r.pointId && { pointId: r.pointId, pointDescription: r.pointDescription || r.pointId }),
    },
    paymentData: { paymentType: "balance" },
    packages: [{ ...input.package, type: 0 }],
    pickupDate: input.pickup.date,
    pickupTime: { from: input.pickup.from, to: input.pickup.to },
    content: "Suplementy diety i kosmetyki",
    comments: input.orderNumber,
  };
}
