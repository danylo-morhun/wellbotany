"use client";

import { Dialog } from "@base-ui/react/dialog";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { type PickupPoint, pointKey } from "../lib/points";
import {
  POINT_SERVICE_METHOD,
  POINT_SERVICES,
  type PointService,
  SHIPPING_LABELS,
  SHIPPING_META,
} from "../lib/shipping";
import type { MapFocus, MapView } from "./PointMap";

// Leaflet touches `window` on import and weighs ~40 KB — load it with the dialog only
const PointMap = dynamic(() => import("./PointMap"), {
  ssr: false,
  loading: () => <div className="h-full min-h-56 w-full animate-pulse bg-muted" />,
});

/** Below this zoom a viewport spans too much for epaka's 100-nearest answer — don't auto-load. */
const AUTOLOAD_MIN_ZOOM = 12;
/** A view centre this close to an earlier request is already covered by its answer. */
const COVERED_KM = 1.5;
const LIST_LIMIT = 50;

type Filter = "all" | PointService;

type Props = {
  /** Shipping cost per carrier, shown on the filter chips and the selected point. */
  costs: Record<PointService, number>;
  onSelect: (point: PickupPoint) => void;
  triggerLabel: string;
  triggerClassName?: string;
};

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (a.lat - b.lat) * 111;
  const dLon = (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

function carrierOf(service: PointService) {
  const method = POINT_SERVICE_METHOD[service];
  return { label: SHIPPING_LABELS[method], logo: SHIPPING_META[method].logo };
}

function CarrierLogo({ service, className }: { service: PointService; className: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-md bg-white p-0.5 ring-1 ring-black/5 ${className}`}
    >
      <Image
        src={carrierOf(service).logo}
        alt=""
        width={64}
        height={44}
        unoptimized
        className="max-h-full w-auto max-w-full object-contain"
      />
    </span>
  );
}

/**
 * Pickup-point finder for all point carriers at once. Opens around the visitor's
 * approximate location, loads more points as the map moves, filters by carrier.
 */
export function PointPicker({ costs, onSelect, triggerLabel, triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<MapView | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [locating, setLocating] = useState(false);
  const fetchedCentersRef = useRef<{ lat: number; lon: number }[]>([]);
  const autoLoadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusSeqRef = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  function focusOn(next: DistributiveOmit<MapFocus, "seq">) {
    setFocus({ ...next, seq: ++focusSeqRef.current } as MapFocus);
  }

  /** Fetches points and merges them into what the map already shows. */
  async function load(params: Record<string, string>) {
    setPending((n) => n + 1);
    setError(false);
    try {
      const res = await fetch(
        `/api/points?${new URLSearchParams({ services: POINT_SERVICES.join(","), ...params })}`,
      );
      if (!res.ok) throw new Error(`points ${res.status}`);
      const data = (await res.json()) as {
        points: PickupPoint[];
        center: { lat: number; lon: number } | null;
      };
      if (data.center) fetchedCentersRef.current.push(data.center);
      setPoints((prev) => {
        const merged = new Map(prev.map((p) => [pointKey(p), p]));
        for (const p of data.points) merged.set(pointKey(p), p);
        return [...merged.values()];
      });
      return data;
    } catch (err) {
      console.error("[point-picker]", err);
      setError(true);
      return null;
    } finally {
      setPending((n) => n - 1);
    }
  }

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    if (view) {
      // The map remounts with the dialog — bring back the last view
      focusOn({ kind: "center", lat: view.lat, lon: view.lon, zoom: view.zoom });
      return;
    }
    // No params → the API searches around the visitor's IP location
    const data = await load({});
    if (data?.center) focusOn({ kind: "center", ...data.center, zoom: 14 });
  }

  async function search(q: string) {
    setNotFound(false);
    const data = await load({ q });
    if (!data) return;
    const found = data.points.filter((p) => filter === "all" || p.service === filter);
    if (found.length === 0) {
      setNotFound(true);
      return;
    }
    setSelectedKey(null);
    focusOn({ kind: "fit", points: found });
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lon } = pos.coords;
        focusOn({ kind: "center", lat, lon, zoom: 15 });
        await load({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
      },
      () => setLocating(false),
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  function handleViewChange(next: MapView, byUser: boolean) {
    setView(next);
    clearTimeout(autoLoadTimerRef.current);
    if (!byUser || next.zoom < AUTOLOAD_MIN_ZOOM) return;
    setNotFound(false);
    const covered = fetchedCentersRef.current.some((c) => distanceKm(c, next) < COVERED_KM);
    if (covered) return;
    autoLoadTimerRef.current = setTimeout(() => {
      load({ lat: next.lat.toFixed(4), lon: next.lon.toFixed(4) });
    }, 350);
  }

  function highlight(key: string) {
    setSelectedKey(key);
    listRef.current
      ?.querySelector(`[data-point-key="${CSS.escape(key)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function choose(point: PickupPoint) {
    onSelect(point);
    setOpen(false);
  }

  const shown = useMemo(
    () => (filter === "all" ? points : points.filter((p) => p.service === filter)),
    [points, filter],
  );

  // List mirrors the map: points in view, nearest to the centre first
  const listed = useMemo(() => {
    if (!view) return [];
    const [south, west, north, east] = view.bounds;
    return shown
      .filter((p) => p.lat >= south && p.lat <= north && p.lon >= west && p.lon <= east)
      .map((p) => ({ point: p, km: distanceKm(p, view) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, LIST_LIMIT)
      .map(({ point }) => point);
  }, [shown, view]);

  const selected = selectedKey ? shown.find((p) => pointKey(p) === selectedKey) : undefined;
  const zoomedOut = view !== null && view.zoom < AUTOLOAD_MIN_ZOOM;

  let mapNotice: string | null = null;
  if (pending > 0) mapNotice = "Wczytuję punkty…";
  else if (error) mapNotice = "Nie udało się pobrać punktów — spróbuj ponownie";
  else if (notFound) mapNotice = "Nie znaleziono punktów — spróbuj innej nazwy";
  else if (zoomedOut) mapNotice = "Przybliż mapę, aby zobaczyć więcej punktów";

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        }
      >
        <MapPin className="size-4" aria-hidden />
        {triggerLabel}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col bg-background outline-none sm:inset-6 sm:mx-auto sm:max-w-6xl sm:overflow-hidden sm:rounded-xl sm:shadow-float">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1">
            <Dialog.Title className="font-heading text-lg font-semibold">
              Wybierz punkt odbioru
            </Dialog.Title>
            <Dialog.Close
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Zamknij"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="space-y-3 border-b border-border px-4 pt-2 pb-3">
            <div className="flex gap-2">
              <form
                className="flex min-w-0 flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  // React events bubble through the portal — keep this submit out of the checkout form
                  e.stopPropagation();
                  if (query.trim().length >= 2) search(query.trim());
                }}
              >
                <label htmlFor="point-query" className="sr-only">
                  Miasto, ulica lub kod punktu
                </label>
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    id="point-query"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Miasto, ulica lub kod punktu"
                    className="w-full rounded-full border border-border bg-background py-2 pr-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-deep"
                >
                  Szukaj
                </button>
              </form>
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
              >
                <LocateFixed className="size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">
                  {locating ? "Ustalam położenie…" : "W pobliżu mnie"}
                </span>
              </button>
            </div>

            <fieldset className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
              <legend className="sr-only">Przewoźnik</legend>
              {(["all", ...POINT_SERVICES] as const).map((value) => {
                const active = filter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFilter(value);
                      if (value !== "all" && selected && selected.service !== value) {
                        setSelectedKey(null);
                      }
                    }}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full py-1 pr-3 text-sm font-medium transition-colors ${
                      value === "all" ? "pl-3" : "pl-1"
                    } ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/70"
                    }`}
                  >
                    {value === "all" ? (
                      "Wszystkie"
                    ) : (
                      <>
                        <CarrierLogo service={value} className="h-6 w-9" />
                        {carrierOf(value).label}
                        <span className={active ? "opacity-85" : "text-muted-foreground"}>
                          {formatPrice(costs[value])}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </fieldset>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(16rem,50%)_1fr] md:grid-cols-[24rem_1fr] md:grid-rows-1">
            <div className="relative min-h-0 md:order-2">
              <PointMap
                points={shown}
                selectedKey={selectedKey}
                focus={focus}
                onSelect={highlight}
                onViewChange={handleViewChange}
              />
              {mapNotice && (
                <p
                  className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/95 px-4 py-2 text-center text-sm font-medium whitespace-nowrap shadow-float"
                  aria-live="polite"
                >
                  {mapNotice}
                </p>
              )}
              {selected && (
                <div className="absolute inset-x-3 bottom-3 z-10 flex items-start gap-3 rounded-xl bg-background p-3 shadow-float md:right-auto md:w-96">
                  <CarrierLogo service={selected.service} className="h-9 w-14" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">
                      {selected.id}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {formatPrice(costs[selected.service])}
                      </span>
                    </p>
                    <p className="text-muted-foreground">{selected.address}</p>
                    {selected.description && (
                      <p className="text-xs text-muted-foreground">{selected.description}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => choose(selected)}
                      className="mt-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary-deep"
                    >
                      Wybierz ten punkt
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(null)}
                    className="-m-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Zamknij szczegóły punktu"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              )}
            </div>

            <div className="min-h-0 overflow-y-auto border-t border-border md:order-1 md:border-t-0 md:border-r">
              {listed.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  {pending > 0
                    ? "Szukam punktów w pobliżu…"
                    : zoomedOut
                      ? "Przybliż mapę albo wpisz miasto, ulicę lub kod punktu."
                      : "Brak punktów w tym obszarze. Przesuń mapę lub wyszukaj miasto."}
                </p>
              ) : (
                <ul ref={listRef} className="divide-y divide-border">
                  {listed.map((point) => {
                    const key = pointKey(point);
                    return (
                      <li
                        key={key}
                        data-point-key={key}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                          key === selectedKey ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => highlight(key)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left text-sm"
                        >
                          <CarrierLogo service={point.service} className="mt-0.5 h-7 w-11" />
                          <span className="min-w-0">
                            <span className="block font-medium">{point.id}</span>
                            <span className="block text-muted-foreground">{point.address}</span>
                            {point.description && (
                              <span className="block text-xs text-muted-foreground">
                                {point.description}
                              </span>
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => choose(point)}
                          className="shrink-0 rounded-full border border-primary px-3 py-1 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          Wybierz
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
