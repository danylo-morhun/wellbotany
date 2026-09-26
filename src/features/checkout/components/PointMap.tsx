"use client";

import "leaflet/dist/leaflet.css";
import "./point-map.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { PickupPoint } from "../lib/points";

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

type Props = {
  points: PickupPoint[];
  selectedId: string | null;
  onMarkerClick: (id: string) => void;
  /** Fires after the user pans/zooms the map (not after programmatic moves). */
  onUserMove: (center: { lat: number; lon: number }) => void;
};

/** Leaflet map with one circle marker per point. Loaded only when the point dialog opens. */
export default function PointMap({ points, selectedId, onMarkerClick, onUserMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, L.CircleMarker>());
  const handlersRef = useRef({ onMarkerClick, onUserMove });
  // Set before fitBounds/panTo so the resulting moveend isn't reported as a user move
  const programmaticMoveRef = useRef(false);
  handlersRef.current = { onMarkerClick, onUserMove };

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(POLAND_CENTER, 6);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on("moveend", () => {
      if (programmaticMoveRef.current) {
        programmaticMoveRef.current = false;
        return;
      }
      const c = map.getCenter();
      handlersRef.current.onUserMove({ lat: c.lat, lon: c.lng });
    });
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // The dialog animates in — measure again once it has its final size
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    for (const point of points) {
      const marker = L.circleMarker([point.lat, point.lon], {
        radius: 8,
        weight: 2,
        className: "point-marker",
      })
        .bindTooltip(point.address || point.name)
        .on("click", () => handlersRef.current.onMarkerClick(point.id))
        .addTo(layer);
      markersRef.current.set(point.id, marker);
    }
    if (points.length > 0) {
      const bounds = points.map((p) => [p.lat, p.lon] as L.LatLngTuple);
      moveProgrammatically(map, programmaticMoveRef, (m) =>
        m.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 }),
      );
    }
  }, [points]);

  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const selected = id === selectedId;
      marker.setRadius(selected ? 11 : 8);
      marker.getElement()?.classList.toggle("point-marker-selected", selected);
      if (selected) {
        marker.bringToFront();
        const map = mapRef.current;
        if (map && !map.getBounds().contains(marker.getLatLng())) {
          moveProgrammatically(map, programmaticMoveRef, (m) => m.panTo(marker.getLatLng()));
        }
      }
    }
  }, [selectedId]);

  return <div ref={containerRef} className="isolate h-full min-h-56 w-full" />;
}
