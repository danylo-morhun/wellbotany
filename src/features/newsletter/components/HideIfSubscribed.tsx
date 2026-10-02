"use client";

import { useEffect, useState } from "react";
import { isSubscribed } from "../lib/prompt-state";

/** Drops a sign-up block for visitors who already subscribed on this device.
 * Checked once on mount, so a fresh sign-up keeps its thank-you message. */
export function HideIfSubscribed({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => setHidden(isSubscribed()), []);
  return hidden ? null : children;
}
