"use client";

import { Dialog } from "@base-ui/react/dialog";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { PickupPoint } from "../lib/points";
import type { PointService } from "../lib/shipping";

// Leaflet touches `window` on import and weighs ~40 KB — load it with the dialog only
const PointMap = dynamic(() => import("./PointMap"), {
  ssr: false,
  loading: () => <div className="h-full min-h-56 w-full animate-pulse bg-muted" />,
});

type Props = {
  service: PointService;
  pointName: string;
  onSelect: (code: string, name: string) => void;
};

type Status = "idle" | "loading" | "error" | "empty" | "ok";

/** Pickup-point finder: search by city/street/code or location, pick on a map or from the list. */
export function PointPicker({ service, pointName, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [areaCenter, setAreaCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const requestRef = useRef(0);

  async function search(params: Record<string, string>) {
    const requestId = ++requestRef.current;
    setStatus("loading");
    setAreaCenter(null);
    try {
      const res = await fetch(`/api/points?${new URLSearchParams({ service, ...params })}`);
      if (!res.ok) throw new Error(`points ${res.status}`);
      const data = (await res.json()) as { points: PickupPoint[] };
      if (requestId !== requestRef.current) return;
      setPoints(data.points);
      setSelectedId(null);
      setStatus(data.points.length > 0 ? "ok" : "empty");
    } catch (err) {
      if (requestId !== requestRef.current) return;
      console.error("[point-picker]", err);
      setStatus("error");
    }
  }

  function searchByCoords(lat: number, lon: number) {
    return search({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        searchByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => setLocating(false),
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  function highlight(id: string) {
    setSelectedId(id);
    listRef.current
      ?.querySelector(`[data-point-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function choose(point: PickupPoint) {
    const label = point.address ? `${point.id} — ${point.address}` : point.name;
    onSelect(point.id, label);
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none">
        <MapPin className="size-4" aria-hidden />
        Wybierz na mapie
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col bg-background outline-none sm:inset-6 sm:mx-auto sm:max-w-5xl sm:rounded-xl sm:shadow-float">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <Dialog.Title className="text-base font-semibold">Wybierz {pointName}</Dialog.Title>
            <Dialog.Close
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Zamknij"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
            <form
              className="flex min-w-0 flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                // React events bubble through the portal — keep this submit out of the checkout form
                e.stopPropagation();
                if (query.trim().length >= 2) search({ q: query.trim() });
              }}
            >
              <label htmlFor="point-query" className="sr-only">
                Miasto, ulica lub kod punktu
              </label>
              <input
                id="point-query"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Miasto, ulica lub kod punktu"
                className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-deep"
              >
                <Search className="size-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Szukaj</span>
              </button>
            </form>
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
            >
              <LocateFixed className="size-4" aria-hidden />
              {locating ? "Ustalam położenie…" : "W pobliżu mnie"}
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[minmax(14rem,40%)_1fr] md:grid-cols-[22rem_1fr] md:grid-rows-1">
            <div className="relative min-h-0 md:order-2">
              <PointMap
                points={points}
                selectedId={selectedId}
                onMarkerClick={highlight}
                onUserMove={setAreaCenter}
              />
              {areaCenter && (
                <button
                  type="button"
                  onClick={() => searchByCoords(areaCenter.lat, areaCenter.lon)}
                  className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background px-4 py-2 text-sm font-medium shadow-float hover:bg-muted"
                >
                  Szukaj w tym obszarze
                </button>
              )}
            </div>

            <div className="min-h-0 overflow-y-auto border-t border-border md:order-1 md:border-t-0 md:border-r">
              {status === "idle" && (
                <p className="p-4 text-sm text-muted-foreground">
                  Wpisz miasto, ulicę lub kod punktu albo użyj swojej lokalizacji.
                </p>
              )}
              {status === "loading" && (
                <p className="p-4 text-sm text-muted-foreground" aria-live="polite">
                  Szukam punktów…
                </p>
              )}
              {status === "empty" && (
                <p className="p-4 text-sm text-muted-foreground" aria-live="polite">
                  Nie znaleziono punktów. Spróbuj innej nazwy miejscowości.
                </p>
              )}
              {status === "error" && (
                <p className="p-4 text-sm text-destructive" aria-live="polite">
                  Nie udało się pobrać punktów. Spróbuj ponownie lub wpisz kod punktu ręcznie.
                </p>
              )}
              {status === "ok" && (
                <ul ref={listRef} className="divide-y divide-border">
                  {points.map((point) => (
                    <li
                      key={point.id}
                      data-point-id={point.id}
                      className={`flex items-start justify-between gap-3 px-4 py-3 ${
                        point.id === selectedId ? "bg-primary/5" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => highlight(point.id)}
                        className="min-w-0 text-left text-sm"
                      >
                        <span className="block font-medium">{point.id}</span>
                        <span className="block text-muted-foreground">{point.address}</span>
                        {point.description && (
                          <span className="block text-xs text-muted-foreground">
                            {point.description}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => choose(point)}
                        className="shrink-0 rounded-full border border-primary px-3 py-1 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        Wybierz
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
