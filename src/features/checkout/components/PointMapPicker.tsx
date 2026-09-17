"use client";

import { useState } from "react";
import type { PointMapService } from "../lib/shipping";

const API_KEY = process.env.NEXT_PUBLIC_FURGONETKA_MAP_KEY;
const SCRIPT_SRC = "https://furgonetka.pl/js/dist/map/map.js";

type FurgonetkaPoint = { code: string; name: string; type: string };

type FurgonetkaMapOptions = {
  apiKey: string;
  courierServices: PointMapService[];
  locale: string;
  mapBounds: string;
  callback: (params: { point: FurgonetkaPoint }) => void;
};

declare global {
  interface Window {
    Furgonetka?: { Map: new (options: FurgonetkaMapOptions) => { show: () => void } };
  }
}

let scriptPromise: Promise<void> | null = null;

// Injected from our own (nonce-trusted) bundle so CSP 'strict-dynamic' allows it.
function loadMapScript(): Promise<void> {
  if (window.Furgonetka) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error("Furgonetka map script failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type Props = {
  service: PointMapService;
  onSelect: (code: string, name: string) => void;
};

/** Opens the Furgonetka pickup-point map (modal). Renders nothing without an API key. */
export function PointMapPicker({ service, onSelect }: Props) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!API_KEY) return null;
  const apiKey = API_KEY;

  async function openMap() {
    setLoading(true);
    setFailed(false);
    try {
      await loadMapScript();
      if (!window.Furgonetka) throw new Error("Furgonetka map unavailable");
      new window.Furgonetka.Map({
        apiKey,
        courierServices: [service],
        locale: "pl",
        mapBounds: "pl",
        callback: ({ point }) => onSelect(point.code, point.name),
      }).show();
    } catch (err) {
      console.error("[point-map]", err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openMap}
        disabled={loading}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary-deep disabled:opacity-50 motion-reduce:transition-none"
      >
        {loading ? "Ładowanie mapy…" : "Wybierz na mapie"}
      </button>
      {failed && (
        <p className="mt-2 text-xs text-destructive">
          Nie udało się załadować mapy. Wpisz kod punktu ręcznie poniżej.
        </p>
      )}
    </div>
  );
}
