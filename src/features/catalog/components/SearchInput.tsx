"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialValue = searchParams.get("szukaj") ?? "";
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus once on mount when arriving via a search intent (?szukaj=...).
  // Never on later param changes — that stole focus from filter controls
  // and raced blur-commits against filter navigations.
  useEffect(() => {
    if (inputRef.current && new URLSearchParams(window.location.search).has("szukaj")) {
      inputRef.current.focus();
    }
  }, []);

  // Sync if URL changes externally (chips cleared, filters navigated)
  useEffect(() => {
    setValue(searchParams.get("szukaj") ?? "");
  }, [searchParams]);

  function commit(query: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("szukaj", query);
    } else {
      params.delete("szukaj");
    }
    params.delete("strona");
    router.push(`/katalog?${params.toString()}`);
  }

  const debouncedCommit = useDebouncedCallback(commit, 400);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          debouncedCommit(e.target.value);
        }}
        placeholder="Szukaj produktów…"
        className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50"
      />
    </div>
  );
}
