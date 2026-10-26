import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Wczytywanie…
      </p>
      <Skeleton className="mb-2 h-8 w-56 rounded-md" />
      <Skeleton className="mb-6 h-4 w-80 max-w-full rounded-md" />
      <div className="space-y-2">
        {["a", "b", "c", "d", "e", "f"].map((id) => (
          <Skeleton key={id} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
