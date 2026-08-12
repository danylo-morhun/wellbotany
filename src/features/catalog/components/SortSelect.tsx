"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  basePath?: string;
};

export function SortSelect({ basePath = "/katalog" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sortuj") ?? "newest";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sortuj");
    } else {
      params.set("sortuj", value);
    }
    params.delete("strona");
    router.push(`${basePath}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <label htmlFor="sortuj" className="whitespace-nowrap text-sm text-muted-foreground">
        Sortuj:
      </label>
      <select
        id="sortuj"
        value={sort}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
      >
        <option value="newest">Najnowsze</option>
        <option value="price_asc">Cena rosnąco</option>
        <option value="price_desc">Cena malejąco</option>
        <option value="name_asc">Nazwa A–Z</option>
        <option value="name_desc">Nazwa Z–A</option>
      </select>
    </div>
  );
}
