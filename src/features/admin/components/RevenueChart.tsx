"use client";

import { useState } from "react";
import { formatPrice, pluralPl } from "@/lib/format";

export type RevenueDay = { key: string; label: string; totalPln: number; orders: number };

/** Round the axis max up to a clean step (100 zł, 200 zł, 500 zł, 1 000 zł…) */
function niceMax(grosz: number): number {
  const zl = Math.max(grosz / 100, 100);
  const magnitude = 10 ** Math.floor(Math.log10(zl));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= zl) ?? 10;
  return step * magnitude * 100;
}

const formatAxis = (grosz: number) =>
  `${new Intl.NumberFormat("pl-PL", { notation: "compact" }).format(grosz / 100)} zł`;

export function RevenueChart({ days }: { days: RevenueDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...days.map((d) => d.totalPln)));
  const ticks = [max, max / 2, 0];
  const hovered = hover !== null ? days[hover] : null;

  return (
    <figure>
      <div className="relative flex h-48 gap-3">
        <div className="flex w-12 shrink-0 flex-col justify-between text-right text-[11px] text-muted-foreground tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 last:translate-y-1/2">
              {formatAxis(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t, i) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-border/70"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: hover-only tooltip; data is in the sr-only table */}
          <div
            className="absolute inset-0 flex items-end gap-0.5"
            onMouseLeave={() => setHover(null)}
          >
            {days.map((d, i) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: hover-only tooltip; data is in the sr-only table
              <div
                key={d.key}
                onMouseEnter={() => setHover(i)}
                className="flex h-full flex-1 items-end justify-center"
              >
                <div
                  className="w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity duration-100 motion-reduce:transition-none"
                  style={{
                    height: d.totalPln ? `max(2px, ${(d.totalPln / max) * 100}%)` : 0,
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
              </div>
            ))}
          </div>
          {hovered && hover !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-popover px-3 py-2 text-xs whitespace-nowrap shadow-float"
              style={{ left: `${((hover + 0.5) / days.length) * 100}%` }}
            >
              <p className="text-muted-foreground">{hovered.label}</p>
              <p className="font-semibold tabular-nums">{formatPrice(hovered.totalPln)}</p>
              <p className="text-muted-foreground">
                {hovered.orders} {pluralPl(hovered.orders, "zamówienie", "zamówienia", "zamówień")}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-15 text-[11px] text-muted-foreground">
        <span>{days[0]?.label}</span>
        <span>{days[Math.floor(days.length / 2)]?.label}</span>
        <span>{days.at(-1)?.label}</span>
      </div>
      {/* sr-only on the div — a <table> ignores the 1px box and still takes layout height */}
      <div className="sr-only">
        <table>
          <caption>Wartość zamówień dziennie</caption>
          <tbody>
            {days.map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.label}</th>
                <td>{formatPrice(d.totalPln)}</td>
                <td>{d.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
