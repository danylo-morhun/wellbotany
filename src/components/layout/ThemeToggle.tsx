"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Theme is unknown until hydration; render a stable placeholder first
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span className="rounded-full p-2.5 text-muted-foreground" aria-hidden="true">
        <Sun className="size-5" />
      </span>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
      className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary-ink"
    >
      <span
        key={isDark ? "dark" : "light"}
        className="block animate-pop-in motion-reduce:animate-none"
      >
        {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
      </span>
    </button>
  );
}
