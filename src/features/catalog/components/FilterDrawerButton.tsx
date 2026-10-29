"use client";
import { SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BrandItem, CategoryItem, TagItem } from "../actions";
import { activeFilterCount } from "../lib/active-filters";
import { FilterSidebar } from "./FilterSidebar";

type Props = {
  categories: CategoryItem[];
  brands: BrandItem[];
  tags: TagItem[];
  basePath?: string;
  /** Passed through to FilterSidebar, for category and brand pages */
  impliedCategory?: string;
  impliedBrand?: string;
};

export function FilterDrawerButton({
  categories,
  brands,
  tags,
  basePath,
  impliedCategory,
  impliedBrand,
}: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = activeFilterCount(useSearchParams());

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted lg:hidden"
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtruj
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
            <span className="sr-only">aktywne filtry: </span>
            {activeCount}
          </span>
        )}
      </button>

      {/* Stays open while filtering — results update behind it */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[320px] p-0">
          <SheetHeader className="px-4 py-2">
            <SheetTitle className="text-base">Filtry</SheetTitle>
            <SheetClose
              aria-label="Zamknij"
              className="-mr-2 flex size-11 items-center justify-center rounded-full transition-colors hover:bg-secondary"
            >
              <X className="size-5" aria-hidden />
            </SheetClose>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <FilterSidebar
              categories={categories}
              brands={brands}
              tags={tags}
              basePath={basePath}
              impliedCategory={impliedCategory}
              impliedBrand={impliedBrand}
              inDrawer
            />
          </div>
          <SheetFooter className="px-4 py-3">
            <SheetClose className="flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep">
              Pokaż wyniki
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
