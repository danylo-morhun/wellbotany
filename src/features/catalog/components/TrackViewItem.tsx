"use client";

import { useEffect } from "react";
import { type AnalyticsItem, trackItems } from "@/lib/analytics";

/** Sends GA4 view_item once per product page view (no-op without consent). */
export function TrackViewItem({ item }: { item: AnalyticsItem }) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once per product, not per render (item is a new object each time)
  useEffect(() => {
    trackItems("view_item", [item]);
  }, [item.itemId]);
  return null;
}
