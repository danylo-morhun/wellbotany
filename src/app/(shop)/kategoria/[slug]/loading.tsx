import { Skeleton } from "@/components/ui/skeleton";
import { FilterSidebarSkeleton } from "@/features/catalog/components/FilterSidebarSkeleton";
import { ProductGridSkeleton } from "@/features/catalog/components/ProductGridSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-8 w-64" />
      <div className="mt-6 flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <FilterSidebarSkeleton />
        </aside>
        <div className="min-w-0 flex-1">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
