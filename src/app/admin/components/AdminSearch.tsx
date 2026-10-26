"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { inputClass } from "@/features/products/components/editor/fields";
import { cn } from "@/lib/utils";

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
    <div className="relative w-full max-w-sm">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        defaultValue={searchParams.get("szukaj") ?? ""}
        onChange={(e) => handleSearch(e.target.value)}
        className={cn(inputClass, "h-9 bg-card pr-3 pl-9")}
      />
    </div>
  );
}
