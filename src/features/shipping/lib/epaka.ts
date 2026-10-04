// epaka.pl REST API (spec: https://api.epaka.pl/epaka-api.json). Auth is OAuth2
// client credentials of the app registered in the shop's own epaka account.
const API = "https://api.epaka.pl";

export class EpakaError extends Error {}

export function isEpakaConfigured(): boolean {
  return Boolean(process.env.EPAKA_CLIENT_ID && process.env.EPAKA_CLIENT_SECRET);
}

let token: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.expiresAt > Date.now()) return token.value;
  const id = process.env.EPAKA_CLIENT_ID;
  const secret = process.env.EPAKA_CLIENT_SECRET;
  if (!id || !secret) throw new EpakaError("Brak EPAKA_CLIENT_ID / EPAKA_CLIENT_SECRET");

  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new EpakaError(`Logowanie do epaka nie powiodło się (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  // epaka keeps 15 live tokens per app — reuse one per instance until shortly before expiry
  token = {
    value: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
  };
  return token.value;
}

/** Readable message from epaka's error bodies ({ message } or { errors: [{ message }] }). */
function errorMessage(body: unknown, status: number): string {
  const b = body as { message?: string; error?: string; errors?: { message?: string }[] } | null;
  const parts = [b?.message, b?.error, ...(b?.errors ?? []).map((e) => e.message)].filter(Boolean);
  return parts.length > 0 ? `epaka: ${parts.join("; ")}` : `epaka: błąd ${status}`;
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new EpakaError(errorMessage(body, res.status));
  return body as T;
}

export type EpakaPackage = {
  weight: number; // kg
  length: number; // cm
  width: number;
  height: number;
  type: 0; // standard packaging
};

/** Gross price in grosz per epaka courier id, for one domestic parcel; unavailable couriers are left out. */
export async function getEpakaPrices(
  pkg: EpakaPackage,
  senderPostCode: string,
): Promise<Map<number, number>> {
  const data = await call<{
    couriers?: { courier?: { id?: number }; available?: boolean; grossPriceTotal?: number }[];
  }>("/v1/order/prices", {
    method: "POST",
    body: {
      shippingType: "package",
      senderCountry: "PL",
      receiverCountry: "PL",
      senderPostCode,
      // Domestic prices don't depend on the destination; any valid code works
      receiverPostCode: "00-001",
      packages: [pkg],
    },
  });
  const prices = new Map<number, number>();
  for (const c of data.couriers ?? []) {
    if (c.available && c.courier?.id != null && c.grossPriceTotal != null) {
      prices.set(c.courier.id, Math.round(c.grossPriceTotal * 100));
    }
  }
  return prices;
}

// DHL's pickup hours depend on the shipment type; "ex" = parcels up to 31.5 kg
const DHL_COURIER_IDS = new Set([8, 22]);

/**
 * First shipping day and, when the courier collects from the door, its first
 * time slot (null slot = the parcel must be dropped off at a point).
 */
export async function getEpakaShippingDay(
  courierId: number,
  postCode: string,
): Promise<{ date: string; slot: { from: string; to: string } | null } | null> {
  const days = await call<{ couriers?: { courierId: number; availableDates?: string[] }[] }>(
    `/v1/order/pickup-date?${new URLSearchParams({ "couriers[]": String(courierId), postCode })}`,
  );
  const date = days.couriers?.find((c) => c.courierId === courierId)?.availableDates?.[0];
  if (!date) return null;
  const hours = await call<{ timeSlots?: { timeFrom: string; timeTo: string }[] }>(
    `/v1/order/pickup-hours?${new URLSearchParams({
      courierId: String(courierId),
      postCode,
      senderCountry: "PL",
      date,
      ...(DHL_COURIER_IDS.has(courierId) && { type: "ex" }),
    })}`,
  );
  const slot = hours.timeSlots?.[0];
  return { date, slot: slot ? { from: slot.timeFrom, to: slot.timeTo } : null };
}

export type EpakaOrderBody = Record<string, unknown>;

/** Places a paid shipment order; returns epaka's order id. */
export async function createEpakaOrder(body: EpakaOrderBody): Promise<{
  orderId: number;
  result: number;
  message: string | null;
}> {
  const data = await call<{ orderId: number; orderProcessResult: number; message?: string }>(
    "/v1/order",
    { method: "POST", body },
  );
  return { orderId: data.orderId, result: data.orderProcessResult, message: data.message ?? null };
}

/** Waybill number, once the courier company has accepted the shipment. */
export async function getEpakaLabelNumber(orderId: number): Promise<string | null> {
  const data = await call<{ labelNumber?: string | null }>(`/v1/user/orders/${orderId}`);
  return data.labelNumber || null;
}

/** Shipping label as PDF bytes. */
export async function getEpakaLabel(orderId: number): Promise<Buffer> {
  const data = await call<{ document: string }>(`/v1/user/orders/${orderId}/label`);
  return Buffer.from(data.document, "base64");
}

export type SenderPoint = { id: string; description: string };

/** Points in `city` where the carrier accepts parcels from senders (public endpoint). */
export async function getEpakaSenderPoints(
  courierId: number,
  city: string,
): Promise<SenderPoint[]> {
  const params = new URLSearchParams({
    "couriers[]": String(courierId),
    pointFunction: "sender",
    query: city,
    limit: "20",
  });
  try {
    const res = await fetch(`${API}/v1/points?${params}`, {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { points?: { id: string; name: string }[] };
    return (data.points ?? []).map((p) => ({ id: p.id, description: p.name }));
  } catch {
    return [];
  }
}

/** Address of a carrier pickup point by its code (public endpoint, no token). */
export async function findEpakaPoint(
  courierId: number,
  pointId: string,
): Promise<{ city: string; postCode: string; street: string } | null> {
  const params = new URLSearchParams({
    "couriers[]": String(courierId),
    pointFunction: "receiver",
    query: pointId,
    limit: "10",
  });
  try {
    const res = await fetch(`${API}/v1/points?${params}`, {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      points?: {
        id: string;
        city: string | null;
        postCode: string | null;
        street: string | null;
        number: string | null;
      }[];
    };
    const p = data.points?.find((x) => x.id === pointId);
    if (!p) return null;
    return {
      city: p.city ?? "",
      postCode: p.postCode ?? "",
      street: [p.street, p.number].filter(Boolean).join(" "),
    };
  } catch {
    return null;
  }
}
