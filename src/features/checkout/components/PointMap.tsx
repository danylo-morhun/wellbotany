"use client";

import "leaflet/dist/leaflet.css";
import "./point-map.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { type PickupPoint, pointKey } from "../lib/points";
import { POINT_SERVICE_METHOD, SHIPPING_META } from "../lib/shipping";

const POLAND_CENTER: L.LatLngTuple = [52.07, 19.48];

/** Runs a map move flagged as programmatic, so its moveend isn't reported as a user move. */
function moveProgrammatically(map: L.Map, flag: { current: boolean }, move: (map: L.Map) => void) {
  flag.current = true;
  move(map);
  // A move to the current view fires no moveend — don't swallow the next user move
  setTimeout(() => {
    flag.current = false;
  }, 600);
}

/** Marker look per zoom: carrier dots far out, small logo badges mid-range, logo pins up close. */
function densityFor(zoom: number): "dot" | "mini" | "full" {
  if (zoom < 11) return "dot";
  if (zoom < 15) return "mini";
  return "full";
}

export type MapView = {
  lat: number;
  lon: number;
  zoom: number;
  /** [south, west, north, east] */
  bounds: [number, number, number, number];
};

/** One-shot camera request; a new `seq` re-runs it even for the same target. */
export type MapFocus =
  | { seq: number; kind: "center"; lat: number; lon: number; zoom: number }
  | { seq: number; kind: "fit"; points: { lat: number; lon: number }[] };

type Props = {
  points: PickupPoint[];
  selectedKey: string | null;
  focus: MapFocus | null;
  onSelect: (key: string) => void;
  /** Fires after every move; `byUser` is false for moves made through `focus` or selection. */
  onViewChange: (view: MapView, byUser: boolean) => void;
};

function pointIcon(point: PickupPoint, selected: boolean): L.DivIcon {
  const logo = SHIPPING_META[POINT_SERVICE_METHOD[point.service]].logo;
  return L.divIcon({
    // Zero-size anchor at the point; the pin positions itself around it in CSS
    className: "pm-icon",
    iconSize: [0, 0],
    html: `<div class="pm-pin${selected ? " pm-selected" : ""}" data-service="${point.service}"><img src="${logo}" alt="" draggable="false"></div>`,
  });
}

/** Leaflet map with a carrier-logo marker per point. Loaded only when the point dialog opens. */
export default function PointMap({ points, selectedKey, focus, onSelect, onViewChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, { marker: L.Marker; point: PickupPoint }>());
  const selectedRef = useRef(selectedKey);
  const handlersRef = useRef({ onSelect, onViewChange });
  // Set before programmatic moves so the resulting moveend isn't reported as a user move
  const programmaticMoveRef = useRef(false);
  handlersRef.current = { onSelect, onViewChange };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const map = L.map(container, { zoomControl: false }).setView(POLAND_CENTER, 6);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const applyDensity = () => {
      container.dataset.density = densityFor(map.getZoom());
    };
    applyDensity();
    map.on("zoomend", applyDensity);
    map.on("moveend", () => {
      const byUser = !programmaticMoveRef.current;
      programmaticMoveRef.current = false;
      const c = map.getCenter();
      const b = map.getBounds();
      handlersRef.current.onViewChange(
        {
          lat: c.lat,
          lon: c.lng,
          zoom: map.getZoom(),
          bounds: [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()],
        },
        byUser,
      );
    });
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // The dialog animates in — measure again once it has its final size
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      // The markers died with the map — let the next mount (Strict Mode, reopen) re-add them
      markersRef.current.clear();
    };
  }, []);

  // Diff markers by key so panning (which adds points) doesn't rebuild the whole layer
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const markers = markersRef.current;
    const next = new Map(points.map((p) => [pointKey(p), p]));
    for (const [key, { marker }] of markers) {
      if (!next.has(key)) {
        layer.removeLayer(marker);
        markers.delete(key);
      }
    }
    for (const [key, point] of next) {
      if (markers.has(key)) continue;
      const selected = key === selectedRef.current;
      const marker = L.marker([point.lat, point.lon], {
        icon: pointIcon(point, selected),
        title: `${point.id}, ${point.address}`,
        alt: point.id,
        riseOnHover: true,
        zIndexOffset: selected ? 1000 : 0,
      })
        .on("click", () => handlersRef.current.onSelect(key))
        .addTo(layer);
      markers.set(key, { marker, point });
    }
  }, [points]);

  useEffect(() => {
    const previous = selectedRef.current;
    selectedRef.current = selectedKey;
    const markers = markersRef.current;
    const prev = previous ? markers.get(previous) : undefined;
    if (prev && previous !== selectedKey) {
      prev.marker.setIcon(pointIcon(prev.point, false)).setZIndexOffset(0);
    }
    const current = selectedKey ? markers.get(selectedKey) : undefined;
    if (!current) return;
    current.marker.setIcon(pointIcon(current.point, true)).setZIndexOffset(1000);
    const map = mapRef.current;
    if (map && !map.getBounds().pad(-0.1).contains(current.marker.getLatLng())) {
      moveProgrammatically(map, programmaticMoveRef, (m) => m.panTo(current.marker.getLatLng()));
    }
  }, [selectedKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!focus || !map) return;
    if (focus.kind === "center") {
      moveProgrammatically(map, programmaticMoveRef, (m) =>
        m.setView([focus.lat, focus.lon], focus.zoom, { animate: false }),
      );
    } else if (focus.points.length > 0) {
      const bounds = focus.points.map((p) => [p.lat, p.lon] as L.LatLngTuple);
      moveProgrammatically(map, programmaticMoveRef, (m) =>
        m.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 }),
      );
    }
  }, [focus]);

  return <div ref={containerRef} className="point-map isolate h-full min-h-56 w-full" />;
}
