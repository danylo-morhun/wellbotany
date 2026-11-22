"use client";

import { type ReactNode, useEffect, useState } from "react";
import { isCampaignLive } from "../lib/campaign";

type Props = { startsAt: string; endsAt: string; children: ReactNode; fallback?: ReactNode };

// setTimeout overflows above ~24.8 days
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Shows its children only inside the campaign window, by the visitor's clock.
 * The cached page can be up to an hour (or one stale visit) old, so the server
 * alone would open the section late and close it late. */
export function CampaignWindow({ startsAt, endsAt, children, fallback = null }: Props) {
  const [live, setLive] = useState(true);

  useEffect(() => {
    const range = { startsAt: new Date(startsAt), endsAt: new Date(endsAt) };
    let timer: number | undefined;
    const check = () => {
      const now = new Date();
      setLive(isCampaignLive(range, now));
      const next = now < range.startsAt ? range.startsAt : range.endsAt;
      const wait = next.getTime() - now.getTime();
      if (wait > 0) timer = window.setTimeout(check, Math.min(wait + 1000, MAX_TIMEOUT_MS));
    };
    check();
    return () => window.clearTimeout(timer);
  }, [startsAt, endsAt]);

  return live ? children : fallback;
}
