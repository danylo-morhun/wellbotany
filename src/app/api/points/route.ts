import { type NextRequest, NextResponse } from "next/server";
import {
  EPAKA_COURIER_IDS,
  isPointService,
  type PickupPoint,
} from "@/features/checkout/lib/points";
import type { PointService } from "@/features/checkout/lib/shipping";

// Pickup-point search for the checkout map. Proxied because the epaka API sends
// no CORS headers for our origin; the points endpoint itself needs no token.
const EPAKA_POINTS_URL = "https://api.epaka.pl/v1/points";
// epaka caps answers at 100 points per courier; `limit` counts all couriers together
const LIMIT_PER_COURIER = 100;
// Map start when the visitor's IP gives no usable location (local dev, non-PL IPs)
const WARSAW = { lat: 52.2297, lon: 21.0122 };

const SERVICE_BY_COURIER = new Map(
  Object.entries(EPAKA_COURIER_IDS).map(([service, id]) => [id, service as PointService]),
);

type EpakaPoint = {
  id: string;
  name: string;
  courier: { id: number };
  latitude: number;
  longitude: number;
  city: string | null;
  postCode: string | null;
  street: string | null;
  number: string | null;
};

function toPoint(p: EpakaPoint, service: PointService): PickupPoint {
  // InPost names end with a location hint: "Paczkomat KAL06M - Kalisz, Kościuszki 1a (przy …)";
  // Orlen repeats the point id there instead
  const hint = p.name.match(/\(([^()]+)\)\s*$/)?.[1]?.trim() ?? null;
  const street = [p.street, p.number].filter(Boolean).join(" ");
  const city = [p.postCode, p.city].filter(Boolean).join(" ");
  return {
    id: p.id,
    service,
    name: p.name,
    address: [street, city].filter(Boolean).join(", "),
    description: hint && hint !== p.id ? hint : null,
    lat: p.latitude,
    lon: p.longitude,
  };
}

/** Approximate visitor location from Vercel's IP geo headers — only inside Poland. */
function ipLocation(req: NextRequest): { lat: number; lon: number } | null {
  const lat = Number(req.headers.get("x-vercel-ip-latitude"));
  const lon = Number(req.headers.get("x-vercel-ip-longitude"));
  const inPoland = lat >= 49 && lat <= 55 && lon >= 14 && lon <= 24.2;
  return inPoland ? { lat, lon } : null;
}

/**
 * `services` is a comma list (inpost,orlen). Search by `q`, by `lat`/`lon`, or with
 * neither — then around the visitor's IP location, so the map opens with points.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const services = [
    ...new Set((params.get("services") ?? params.get("service") ?? "").split(",")),
  ].filter(isPointService);
  if (services.length === 0) {
    return NextResponse.json({ error: "Unknown service" }, { status: 400 });
  }

  const query = params.get("q")?.trim().slice(0, 80) ?? "";
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0);
  const byIp = !query && !hasCoords;
  const center = hasCoords ? { lat, lon } : byIp ? (ipLocation(req) ?? WARSAW) : null;

  const upstream = new URLSearchParams({
    pointFunction: "receiver",
    limit: String(LIMIT_PER_COURIER * services.length),
  });
  for (const service of services) upstream.append("couriers[]", String(EPAKA_COURIER_IDS[service]));
  if (center) {
    upstream.set("lat", center.lat.toFixed(4));
    upstream.set("lon", center.lon.toFixed(4));
  } else {
    upstream.set("query", query);
  }

  try {
    const res = await fetch(`${EPAKA_POINTS_URL}?${upstream}`, {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`epaka points ${res.status}`);
    const data = (await res.json()) as { points?: EpakaPoint[] };
    const points = (data.points ?? []).flatMap((p) => {
      const service = SERVICE_BY_COURIER.get(p.courier?.id);
      return service ? [toPoint(p, service)] : [];
    });
    return NextResponse.json(
      { points, center },
      {
        headers: {
          // The IP-located answer differs per visitor — never share it through the CDN
          "Cache-Control": byIp
            ? "private, no-store"
            : "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    console.error("[points]", err);
    return NextResponse.json({ error: "Points unavailable" }, { status: 502 });
  }
}
