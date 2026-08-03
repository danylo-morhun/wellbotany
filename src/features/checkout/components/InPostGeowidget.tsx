"use client";

import Script from "next/script";
import { useEffect, useId, useState } from "react";

const TOKEN = process.env.NEXT_PUBLIC_INPOST_GEOWIDGET_TOKEN;

type InPostPoint = {
  name: string;
  address?: { line1?: string; line2?: string };
};

type Props = {
  onSelect: (machineId: string, machineName: string) => void;
};

export function InPostGeowidget({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [scriptReady, setScriptReady] = useState(() => {
    return typeof window !== "undefined" && Boolean(window.customElements?.get("inpost-geowidget"));
  });
  const fnName = `inpostOnPoint_${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    if (!open) return;
    if (!document.querySelector("link[data-inpost-geowidget-css]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://geowidget.inpost.pl/inpost-geowidget.css";
      link.setAttribute("data-inpost-geowidget-css", "true");
      document.head.appendChild(link);
    }
    (window as unknown as Record<string, unknown>)[fnName] = (point: InPostPoint) => {
      const label = point.address?.line1 ? `${point.name} — ${point.address.line1}` : point.name;
      onSelect(point.name, label);
      setOpen(false);
    };
    return () => {
      delete (window as unknown as Record<string, unknown>)[fnName];
    };
  }, [open, fnName, onSelect]);

  if (!TOKEN) return null;

  return (
    <div>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-primary underline underline-offset-2"
        >
          Wybierz na mapie
        </button>
      )}
      {open && (
        <div className="mt-3 h-[420px] overflow-hidden rounded-lg border border-border">
          <Script
            src="https://geowidget.inpost.pl/inpost-geowidget.js"
            strategy="afterInteractive"
            onReady={() => setScriptReady(true)}
          />
          {scriptReady && (
            <div
              className="h-full w-full"
              dangerouslySetInnerHTML={{
                __html: `<inpost-geowidget token="${TOKEN}" onpoint="${fnName}" language="pl" config="parcelCollect" style="height: 100%; display: block;"></inpost-geowidget>`,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
