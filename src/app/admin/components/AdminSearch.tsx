"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export function AdminSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (term) params.set("szukaj", term);
    else params.delete("szukaj");
    params.delete("strona");
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <input
      type="search"
      placeholder={placeholder}
      aria-label={placeholder}
      defaultValue={searchParams.get("szukaj") ?? ""}
      onChange={(e) => handleSearch(e.target.value)}
      className="w-full max-w-sm rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50"
    />
  );
}
