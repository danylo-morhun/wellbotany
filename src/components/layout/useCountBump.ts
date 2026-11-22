"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Bumps a key each time `count` grows after mount, so a badge keyed on it
 * replays its pop animation on add — never on first paint or on removal.
 */
export function useCountBump(count: number) {
  const prev = useRef(count);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (count > prev.current) setBump((b) => b + 1);
    prev.current = count;
  }, [count]);
  return bump;
}
