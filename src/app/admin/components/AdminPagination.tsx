"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  currentPage: number;
  totalPages: number;
};

export function AdminPagination({ currentPage, totalPages }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [jumpValue, setJumpValue] = useState(String(currentPage));

  useEffect(() => {
    setJumpValue(String(currentPage));
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    const params = new URLSearchParams(searchParams.toString());
    params.set("strona", String(clamped));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpValue, 10);
    if (Number.isFinite(page)) goToPage(page);
  };

  const navButtonClass =
    "flex size-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40";

  return (
    <div className="flex items-center justify-end gap-2 pt-4">
      <button
        type="button"
        onClick={() => goToPage(1)}
        disabled={currentPage <= 1}
        className={navButtonClass}
        aria-label="Pierwsza strona"
      >
        <ChevronsLeft className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className={navButtonClass}
        aria-label="Poprzednia strona"
      >
        <ChevronLeft className="size-4" />
      </button>
      <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onBlur={handleJumpSubmit}
          className="w-14 rounded-lg border border-border bg-card px-2 py-1 text-center text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-label="Przejdź do strony"
        />
        <span>/ {totalPages}</span>
      </form>
      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={navButtonClass}
        aria-label="Następna strona"
      >
        <ChevronRight className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => goToPage(totalPages)}
        disabled={currentPage >= totalPages}
        className={navButtonClass}
        aria-label="Ostatnia strona"
      >
        <ChevronsRight className="size-4" />
      </button>
    </div>
  );
}
