import { type NextRequest, NextResponse } from "next/server";
import {
  EPAKA_COURIER_IDS,
  isPointService,
  type PickupPoint,
} from "@/features/checkout/lib/points";

// Pickup-point search for the checkout map. Proxied because the epaka API sends
// no CORS headers for our origin; the points endpoint itself needs no token.
const EPAKA_POINTS_URL = "https://api.epaka.pl/v1/points";
const LIMIT = 60;

type EpakaPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string | null;
  postCode: string | null;
  street: string | null;
  number: string | null;
};

function toPoint(p: EpakaPoint): PickupPoint {
  // InPost names end with a location hint: "Paczkomat KAL06M - Kalisz, Kościuszki 1a (przy …)";
  // Orlen repeats the point id there instead
  const hint = p.name.match(/\(([^()]+)\)\s*$/)?.[1]?.trim() ?? null;
  const street = [p.street, p.number].filter(Boolean).join(" ");
  const city = [p.postCode, p.city].filter(Boolean).join(" ");
  return {
    id: p.id,
    name: p.name,
    address: [street, city].filter(Boolean).join(", "),
    description: hint && hint !== p.id ? hint : null,
    lat: p.latitude,
    lon: p.longitude,
  };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const service = params.get("service");
  if (!isPointService(service)) {
    return NextResponse.json({ error: "Unknown service" }, { status: 400 });
  }

  const query = params.get("q")?.trim().slice(0, 80) ?? "";
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0);
  if (!query && !hasCoords) {
    return NextResponse.json({ error: "Missing q or lat/lon" }, { status: 400 });
  }

  const upstream = new URLSearchParams({
    "couriers[]": String(EPAKA_COURIER_IDS[service]),
    pointFunction: "receiver",
    limit: String(LIMIT),
  });
  if (hasCoords) {
    upstream.set("lat", lat.toFixed(4));
    upstream.set("lon", lon.toFixed(4));
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
    const points = (data.points ?? []).map(toPoint);
    return NextResponse.json(
      { points },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    console.error("[points]", err);
    return NextResponse.json({ error: "Points unavailable" }, { status: 502 });
  }
}
